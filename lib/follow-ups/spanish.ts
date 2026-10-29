/** Spanish twins of the built-in follow-up steps. Custom office copy stays in the language it was written. */
export const SPANISH_FOLLOW_UPS: Record<string, { subject: string; body: string }> = {
  "cold-text-now": {
    subject: "",
    body: "Hola {client}, le habla {company}. Podemos ver el trabajo en {address} y enviar un precio de pintura. Elija una hora: {book}",
  },
  "cold-email-1h": {
    subject: "Estimado de pintura para {address}",
    body: "Hola {client},\n\nGracias por escribir a {company}. Podemos medir {address} y enviar un precio por escrito.\n\nElija una hora para la visita: {book}\n\n{salesperson}\n{company}",
  },
  "cold-text-1d": {
    subject: "",
    body: "Hola {client}, le escribimos por el trabajo de pintura en {address}. ¿Sigue queriendo un estimado esta semana?",
  },
  "cold-email-3d": {
    subject: "¿Reservamos un lugar para {address}?",
    body: "Hola {client},\n\nTodavía no hay una visita confirmada. Responda si quiere que {company} cotice la pintura y fijamos una hora.\n\n{salesperson}\n{company}",
  },
  "cold-text-5d": {
    subject: "",
    body: "Última nota de {company} sobre {address}. Responda si todavía quiere el estimado y lo retomamos.",
  },
  "warm-email-2d": {
    subject: "¿Sigue pensando en la pintura?",
    body: "Hola {client},\n\nCuando quiera un precio para {address}, {company} puede verlo. Sin prisa.\n\n{salesperson}\n{company}",
  },
  "warm-text-7d": {
    subject: "",
    body: "Hola {client}, {company} todavía puede cotizar la pintura en {address}. Responda si quiere una hora.",
  },
  "warm-email-14d": {
    subject: "Estamos aquí cuando el trabajo de pintura esté listo",
    body: "Hola {client},\n\nLe escribimos por {address}. Si ahora es mejor momento, responda y {company} programa la visita.\n\n{salesperson}\n{company}",
  },
  "warm-text-30d": {
    subject: "",
    body: "Hola {client}, una nota más de {company} sobre {address}. Responda si todavía quiere el estimado.",
  },
  "requested-text-1h": {
    subject: "",
    body: "Hola {client}, {company} tiene su solicitud de estimado para {address}. Elija una hora: {book}",
  },
  "requested-email-2d": {
    subject: "Elija una hora para la visita de pintura",
    body: "Hola {client},\n\nTodavía necesitamos un día para medir {address}. Responda con una hora y {company} la confirma.\n\n{salesperson}\n{company}",
  },
  "visit-email-1d": {
    subject: "Mañana: visita de pintura en {address}",
    body: "Hola {client},\n\n{company} estará en {address} el {visit} para medir la pintura. Responda si esa hora ya no sirve.\n\n{salesperson}\n{company}",
  },
  "visit-text-2h": {
    subject: "",
    body: "Hola {client}, {company} estará hoy en {address} para la visita de pintura.",
  },
  "proposal-email-1d": {
    subject: "Su propuesta de pintura está lista",
    body: "Hola {client},\n\nSu propuesta para {address} está lista: {proposalEs}\n\nResponda si tiene preguntas y {company} la revisa con usted.\n\n{salesperson}\n{company}",
  },
  "proposal-text-3d": {
    subject: "",
    body: "Hola {client}, su propuesta de pintura para {address} está aquí: {proposalEs}",
  },
  "proposal-email-7d": {
    subject: "Su propuesta de pintura sigue abierta",
    body: "Hola {client},\n\nLa propuesta para {address} sigue abierta: {proposalEs}\n\nResponda si quiere cambiar el alcance o si está listo para empezar.\n\n{salesperson}\n{company}",
  },
  "accepted-email-1h": {
    subject: "Ya está en la agenda de {company}",
    body: "Hola {client},\n\n{company} tiene el trabajo de pintura en {address}. Confirmaremos la cuadrilla y el día de inicio.\n\n{salesperson}\n{company}",
  },
  "accepted-text-1d": {
    subject: "",
    body: "Hola {client}, {company} tiene el trabajo de pintura en {address}. Confirmaremos el día de inicio en cuanto la cuadrilla esté lista.",
  },
  "job-email-2d": {
    subject: "Su trabajo de pintura empieza {job}",
    body: "Hola {client},\n\n{company} está programado para empezar a pintar en {address} el {job}. Responda si alguien debe recibir a la cuadrilla.\n\n{salesperson}\n{company}",
  },
  "job-text-1d": {
    subject: "",
    body: "Hola {client}, recordatorio: {company} empieza a pintar en {address} el {job}.",
  },
  "progress-text-4h": {
    subject: "",
    body: "Hola {client}, la cuadrilla de {company} está trabajando en {address}. Responda si nos necesita.",
  },
  "progress-email-2d": {
    subject: "¿Cómo va el trabajo de pintura?",
    body: "Hola {client},\n\nLe escribimos por {address}. Responda si algo necesita otra mirada mientras la cuadrilla sigue en el trabajo.\n\n{salesperson}\n{company}",
  },
  "review-email-1d": {
    subject: "¿Cómo nos fue en {address}?",
    body: "Hola {client},\n\nEl trabajo de pintura en {address} está terminado. Si se ve bien, una reseña corta ayuda a otros propietarios a encontrar a {company}. Gracias.\n\n{salesperson}\n{company}",
  },
  "review-text-3d": {
    subject: "",
    body: "Hola {client}, si la pintura en {address} se ve bien, una reseña corta ayuda a otros propietarios a encontrar a {company}. Gracias.",
  },
}
