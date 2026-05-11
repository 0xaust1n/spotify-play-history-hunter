export type DatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export function getDatabaseConfig(databaseOverride?: string): DatabaseConfig {
  return {
    host: Bun.env.DB_HOST ?? "localhost",
    port: Number(Bun.env.DB_PORT ?? 5432),
    user: Bun.env.DB_USERNAME ?? "postgres",
    password: Bun.env.DB_PASSWORD ?? "",
    database: databaseOverride ?? Bun.env.DB_DATABASE ?? "spotify",
  };
}
