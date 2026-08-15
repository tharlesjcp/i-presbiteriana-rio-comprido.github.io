const safeSegment = (value: string) => {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) throw new Error('Segmento de chave R2 inválido.');
  return value;
};

export const mediaKeys = {
  bulletinPdf: (bulletinId: string, number: number) => `bulletins/${safeSegment(bulletinId)}/pdf/boletim-${number}.pdf`,
  bulletinImage: (bulletinId: string, filename: string) => `bulletins/${safeSegment(bulletinId)}/images/${safeSegment(filename)}`,
  templateCover: (templateId: string, filename: string) => `bulletin-templates/${safeSegment(templateId)}/cover/${safeSegment(filename)}`,
  templateBackCover: (templateId: string, filename: string) => `bulletin-templates/${safeSegment(templateId)}/back-cover/${safeSegment(filename)}`,
  agendaImage: (eventId: string, filename: string) => `agenda/${safeSegment(eventId)}/${safeSegment(filename)}`,
};
