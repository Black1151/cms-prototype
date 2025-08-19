import { Injectable, Logger } from '@nestjs/common';

// lazy require to avoid forcing immudb when unused
let Immudb: any;
try { Immudb = require('immudb-node'); } catch {}

@Injectable()
export class AuditService {
  private logger = new Logger(AuditService.name);
  private client: any | null = null;

  private async ensureClient() {
    if (!Immudb || !process.env.IMMUDB_HOST) return null;
    if (this.client) return this.client;
    const client = Immudb.Client({ host: process.env.IMMUDB_HOST, port: Number(process.env.IMMUDB_PORT ?? 3322) });
    await client.login({ user: process.env.IMMUDB_USER ?? 'immu', password: process.env.IMMUDB_PASS ?? 'immu' });
    this.client = client;
    return client;
  }

  async log(event: string, data: Record<string, any>) {
    try {
      const c = await this.ensureClient();
      if (!c) {
        this.logger.debug(`audit(${event}) ${JSON.stringify(data)}`);
        return;
      }
      await c.verifiedSet(event, Buffer.from(JSON.stringify({ at: new Date().toISOString(), ...data })));
    } catch (e) {
      this.logger.warn(`audit failed: ${String((e as Error).message)}`);
    }
  }
}
