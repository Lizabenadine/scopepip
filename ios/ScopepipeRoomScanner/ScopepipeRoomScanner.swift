import ARKit
import AVFoundation
import QuickLook
import RoomPlan
import SwiftUI
import UIKit
import simd

@main
struct ScopepipeRoomScannerApp: App {
    var body: some Scene {
        WindowGroup { ScannerHome() }
    }
}

private struct RoomMeasurements: Encodable {
    let version = 1
    let name: String
    let lengthFt: Double
    let widthFt: Double
    let areaSqFt: Double
    let perimeterFt: Double

    init(room: CapturedRoom) throws {
        // RoomCaptureView is used for exactly one room. If a capture has more
        // than one floor, ask the user to scan a single room again.
        guard room.floors.count == 1, let floor = room.floors.first else {
            throw ScanError.floorNotFound
        }
        let points = floor.polygonCorners.map { point in
            let world = floor.transform * SIMD4<Float>(point.x, point.y, point.z, 1)
            return SIMD2<Double>(Double(world.x), Double(world.z))
        }
        guard points.count >= 3 else { throw ScanError.floorNotFound }

        // Evaluate the bounding rectangle along each polygon edge. Pricing uses
        // the polygon area, including for L-shaped rooms.
        var twiceArea = 0.0
        var perimeter = 0.0
        var bestRectangleArea = Double.infinity
        var dimensions = SIMD2<Double>(repeating: 0)
        for index in points.indices {
            let first = points[index]
            let next = points[(index + 1) % points.count]
            let edge = next - first
            let edgeLength = simd_length(edge)
            twiceArea += first.x * next.y - next.x * first.y
            perimeter += edgeLength
            guard edgeLength > 0.0001 else { continue }
            let axis = edge / edgeLength
            let perpendicular = SIMD2<Double>(-axis.y, axis.x)
            let along = points.map { simd_dot($0, axis) }
            let across = points.map { simd_dot($0, perpendicular) }
            guard let minAlong = along.min(), let maxAlong = along.max(),
                  let minAcross = across.min(), let maxAcross = across.max() else { continue }
            let sides = SIMD2<Double>(maxAlong - minAlong, maxAcross - minAcross)
            let rectangleArea = sides.x * sides.y
            if rectangleArea < bestRectangleArea {
                bestRectangleArea = rectangleArea
                dimensions = sides
            }
        }

        let feetPerMeter = 1 / 0.3048
        name = "Scanned Room"
        lengthFt = max(dimensions.x, dimensions.y) * feetPerMeter
        widthFt = min(dimensions.x, dimensions.y) * feetPerMeter
        areaSqFt = abs(twiceArea) / 2 * feetPerMeter * feetPerMeter
        perimeterFt = perimeter * feetPerMeter
        guard [lengthFt, widthFt, areaSqFt, perimeterFt].allSatisfy({ $0.isFinite && $0 > 0 }) else {
            throw ScanError.floorNotFound
        }
    }
}

private enum ScanError: LocalizedError {
    case floorNotFound
    var errorDescription: String? {
        "No usable single-room floor was found. Try again and slowly scan every wall and the floor boundary."
    }
}

private struct ScanResult {
    let measurements: RoomMeasurements
    let model: URL
    let file: URL

    init(room: CapturedRoom) throws {
        let measurements = try RoomMeasurements(room: room)
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        self.measurements = measurements
        model = directory.appendingPathComponent("Room.usdz")
        file = directory.appendingPathComponent("scopepipe-room-scan.json")
        do {
            try room.export(to: model, exportOptions: .parametric)
            try JSONEncoder().encode(measurements).write(to: file, options: .atomic)
        } catch {
            try? FileManager.default.removeItem(at: directory)
            throw error
        }
    }
}

private struct ScannerHome: View {
    @State private var scanning = false
    @State private var result: ScanResult?
    @State private var previewURL: URL?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Scan one room with a LiDAR-equipped iPhone or iPad. Review the 3D model before using the measurements to estimate flooring.")
                    Button("Scan Room") {
                        Task { @MainActor in
                            if await AVCaptureDevice.requestAccess(for: .video) {
                                errorMessage = nil
                                scanning = true
                            } else {
                                errorMessage = "Allow camera access for Room Scanner in Settings to scan a room."
                            }
                        }
                    }
                    .disabled(!RoomCaptureSession.isSupported)
                    if !RoomCaptureSession.isSupported {
                        Text("This device does not support Apple RoomPlan scanning.")
                    }
                    if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
                }

                if let result {
                    Section("Review measurements") {
                        LabeledContent("Floor area", value: "\(result.measurements.areaSqFt.formatted(.number.precision(.fractionLength(2)))) sq ft")
                        LabeledContent("Perimeter", value: "\(result.measurements.perimeterFt.formatted(.number.precision(.fractionLength(1)))) ft")
                        Button("View 3D Model") { previewURL = result.model }
                        ShareLink("Export Measurements", item: result.file)
                        Text("Choose Save to Files. In the Scopepipe Flooring Estimator, tap Scan Room, select the JSON file, and confirm the floor area.")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Room Scanner")
            .quickLookPreview($previewURL)
            .fullScreenCover(isPresented: $scanning) {
                CaptureScreen(onCancel: { scanning = false }) { outcome in
                    scanning = false
                    do {
                        let scan = try ScanResult(room: outcome.get())
                        if let previous = result {
                            try? FileManager.default.removeItem(at: previous.file.deletingLastPathComponent())
                        }
                        result = scan
                    } catch {
                        errorMessage = error.localizedDescription
                    }
                }
                .ignoresSafeArea()
            }
        }
    }
}

private struct CaptureScreen: UIViewControllerRepresentable {
    let onCancel: () -> Void
    let onResult: (Result<CapturedRoom, Error>) -> Void

    func makeUIViewController(context: Context) -> CaptureController {
        CaptureController(onCancel: onCancel, onResult: onResult)
    }

    func updateUIViewController(_ controller: CaptureController, context: Context) {}
}

private final class CaptureController: UIViewController, RoomCaptureViewDelegate {
    private let onCancel: () -> Void
    private let onResult: (Result<CapturedRoom, Error>) -> Void
    private let capture = RoomCaptureView(frame: .zero)
    private var running = false
    private var started = false
    private var completed = false

    init(onCancel: @escaping () -> Void, onResult: @escaping (Result<CapturedRoom, Error>) -> Void) {
        self.onCancel = onCancel
        self.onResult = onResult
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { nil }

    override func loadView() {
        view = UIView()
        capture.delegate = self
        capture.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(capture)
        let cancel = UIButton(type: .system)
        cancel.configuration = .filled()
        cancel.setTitle("Cancel", for: .normal)
        cancel.addAction(UIAction { [weak self] _ in self?.cancel() }, for: .touchUpInside)
        let done = UIButton(type: .system)
        done.configuration = .filled()
        done.setTitle("Finish Scan", for: .normal)
        done.addAction(UIAction { [weak self, weak done] _ in
            done?.isEnabled = false
            self?.stop()
        }, for: .touchUpInside)
        let buttons = UIStackView(arrangedSubviews: [cancel, done])
        buttons.distribution = .fillEqually
        buttons.spacing = 12
        buttons.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(buttons)
        NSLayoutConstraint.activate([
            capture.topAnchor.constraint(equalTo: view.topAnchor),
            capture.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            capture.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            capture.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            buttons.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            buttons.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        ])
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !started, !completed else { return }
        started = true
        running = true
        capture.captureSession.run(configuration: RoomCaptureSession.Configuration())
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        completed = true
        stop()
    }

    private func stop() {
        guard running else { return }
        running = false
        capture.captureSession.stop()
    }

    private func cancel() {
        guard !completed else { return }
        completed = true
        stop()
        onCancel()
    }

    func captureView(shouldPresent roomDataForProcessing: CapturedRoomData, error: Error?) -> Bool {
        guard !completed else { return false }
        if let error {
            completed = true
            onResult(.failure(error))
            return false
        }
        return true
    }

    func captureView(didPresent processedResult: CapturedRoom, error: Error?) {
        guard !completed else { return }
        completed = true
        if let error { onResult(.failure(error)) }
        else { onResult(.success(processedResult)) }
    }
}
