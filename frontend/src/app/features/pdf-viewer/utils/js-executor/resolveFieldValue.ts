export function resolveFieldValue(
  fieldName: string,
  formData: Record<string, any>,
  allFields: any[],
): string {
  if (formData[fieldName] !== undefined) return formData[fieldName];

  if (allFields) {
    for (const f of allFields) {
      if (f.name === fieldName) {
        const wIdx = f.widgetIndex !== undefined ? f.widgetIndex : 0;
        const widgetKey = `${f.name}-page-${f.page}-w${wIdx}`;
        if (formData[widgetKey] !== undefined) return formData[widgetKey];

        const pageKey = `${f.name}-page-${f.page}`;
        if (formData[pageKey] !== undefined) return formData[pageKey];
      }
    }
  }

  for (const key of Object.keys(formData)) {
    if (key === fieldName || key.startsWith(fieldName + '-page-')) {
      if (formData[key] !== undefined) return formData[key];
    }
  }

  return '';
}
