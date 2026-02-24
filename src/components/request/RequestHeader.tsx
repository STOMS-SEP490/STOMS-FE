type Props = {
  title: string;
  status: string;
};

export default function RequestHeader({ title, status }: Props) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <span className="text-orange-600">{status}</span>
      </div>
    </div>
  );
}
