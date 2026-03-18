interface Props {
  title: string;
  icon?: string;
}

export default function AdminStub({ title, icon = "🚧" }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center select-none">
      <div className="text-5xl mb-4">{icon}</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        This module is under development and will be available soon.
      </p>
    </div>
  );
}
