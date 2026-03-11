export type DashboardTab = "ports" | "docker";

export interface ResourceSnapshot<T> {
  items: T[];
  checkedAt: Date;
  error?: string;
}

export interface PortProcess {
  id: string;
  pid: number;
  processName: string;
  port: number;
  addresses: string[];
  endpoints: string[];
}

export interface DockerContainer {
  id: string;
  shortId: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  command?: string;
}
