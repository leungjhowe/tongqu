export default function HeroHeadline() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h1 className="text-display-lg font-semibold leading-tight text-foreground">
        今天要做什么？
      </h1>
      <p className="text-base text-muted-foreground max-w-md">
        告诉 AI 你想达成的目标，或从最近的项目继续。
      </p>
    </div>
  );
}
