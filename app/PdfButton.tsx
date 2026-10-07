'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { AreaData } from './CreateAreaModal';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    color: '#1e293b',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#f59e0b',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: '#64748b',
  },
  value: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 6,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  col: {
    flex: 1,
  },
  colRight: {
    flex: 1,
    textAlign: 'right',
  },
  totalContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fffbeb',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b45309',
  },
});

export interface InlinePdfDocProps {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  roomScope?: string;
  wallArea?: number;
  laborHours?: number;
  gallonsNeeded?: number;
  totalPrice?: number;
  areas?: AreaData[];
}

export function InlinePdfDoc({
  clientName,
  clientEmail,
  clientPhone,
  clientAddress,
  roomScope,
  wallArea = 0,
  laborHours = 0,
  gallonsNeeded = 0,
  totalPrice = 0,
  areas = [],
}: InlinePdfDocProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ScopePipe Proposal</Text>
            <Text style={styles.subtitle}>Professional Painting Estimate</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client & Site Info</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Client Name:</Text>
            <Text style={styles.value}>{clientName || 'N/A'}</Text>
          </View>
          {clientEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{clientEmail}</Text>
            </View>
          )}
          {clientPhone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{clientPhone}</Text>
            </View>
          )}
          {clientAddress && (
            <View style={styles.row}>
              <Text style={styles.label}>Job Site Address:</Text>
              <Text style={styles.value}>{clientAddress}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Scope / Room:</Text>
            <Text style={styles.value}>{roomScope || 'Main Scope'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scope Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col}>Item / Description</Text>
              <Text style={styles.colRight}>Quantity / Unit</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.col}>Surface Area (Walls)</Text>
              <Text style={styles.colRight}>{wallArea} sq ft</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.col}>Estimated Labor</Text>
              <Text style={styles.colRight}>{laborHours} hrs</Text>
            </View>
            <View style={{ ...styles.tableRow, borderBottomWidth: 0 }}>
              <Text style={styles.col}>Paint Material Required</Text>
              <Text style={styles.colRight}>{gallonsNeeded} gal</Text>
            </View>
          </View>
        </View>

        {areas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Areas</Text>
            {areas.map((area, areaIndex) => (
              <View key={`${area.name}-${areaIndex}`} style={{ marginBottom: 8 }}>
                <Text style={styles.value}>{area.name}</Text>
                {area.items.map((item, itemIndex) => (
                  <View key={`${areaIndex}-${itemIndex}`} style={styles.row}>
                    <Text style={styles.label}>
                      {item.description} ({item.quantity} × ${item.unitPrice})
                    </Text>
                    <Text style={styles.value}>
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Estimate Amount</Text>
          <Text style={styles.totalValue}>${totalPrice}</Text>
        </View>
      </Page>
    </Document>
  );
}