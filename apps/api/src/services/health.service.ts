export type ReadinessDatabase = {
  $queryRawUnsafe: (query: string) => Promise<unknown>;
};

export type ReadinessRedis = {
  isOpen: boolean;
  ping: () => Promise<string>;
};

export class HealthService {
  public constructor(
    private readonly database: ReadinessDatabase,
    private readonly redis?: ReadinessRedis,
  ) {}

  public async isReady(): Promise<boolean> {
    try {
      await this.database.$queryRawUnsafe("SELECT 1");
      if (this.redis) {
        if (!this.redis.isOpen) return false;
        await this.redis.ping();
      }
      return true;
    } catch {
      return false;
    }
  }
}
