/**
 * 写死的最近打开项目数据。本轮不接真实项目存储。
 * 后续接入后端时整体替换为 React Query / store。
 */
export interface Project {
  id: string;
  name: string;
  openedAt: string; // ISO 8601
  thumbnailHue: number; // 0-360，色相；缩略色块用 HSL 生成
  status: "active" | "archived";
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: "p-001",
    name: "滨海新城交通评估",
    openedAt: "2026-06-25T10:32:00.000Z",
    thumbnailHue: 217,
    status: "active",
  },
  {
    id: "p-002",
    name: "东莞地铁 12 号线规划",
    openedAt: "2026-06-24T08:15:00.000Z",
    thumbnailHue: 195,
    status: "active",
  },
  {
    id: "p-003",
    name: "松山湖通勤 OD 矩阵",
    openedAt: "2026-06-22T17:40:00.000Z",
    thumbnailHue: 280,
    status: "active",
  },
  {
    id: "p-004",
    name: "虎门港物流通道仿真",
    openedAt: "2026-06-19T09:00:00.000Z",
    thumbnailHue: 30,
    status: "active",
  },
  {
    id: "p-005",
    name: "城区慢行系统改造方案",
    openedAt: "2026-06-12T14:22:00.000Z",
    thumbnailHue: 145,
    status: "archived",
  },
  {
    id: "p-006",
    name: "2025 节假日出行预测",
    openedAt: "2026-05-30T11:05:00.000Z",
    thumbnailHue: 350,
    status: "archived",
  },
];
