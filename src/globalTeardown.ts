import path from 'path';
import { SuiteReport } from './helpers/report.helper';

export default async function globalTeardown(): Promise<void> {
  const tmpDir    = path.resolve('reports', '.tmp');
  const outputDir = path.resolve('reports');
  const combined  = SuiteReport.mergeAndGenerate(tmpDir, outputDir);
  if (combined) {
    console.log(`\n[suite] Reporte combinado generado: ${combined}`);
  }
}
