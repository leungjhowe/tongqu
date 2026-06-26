interface ComingSoonProps {
  title: string;
}

export default function ComingSoon({ title }: ComingSoonProps) {
  return (
    <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-3 px-6">
      <h1 className="text-h1 text-foreground">{title}</h1>
      <p className="text-body text-muted-foreground">该模块即将上线</p>
    </main>
  );
}
