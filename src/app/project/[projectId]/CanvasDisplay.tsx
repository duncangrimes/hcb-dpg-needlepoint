type CanvasDisplayProps = {
  title: string;
  originalImage: string;
  reducedImage?: string | null;
  manufacturerImage?: string | null;
  meshCount?: number | null;
  width?: number | null;
  numColors?: number | null;
};

export function CanvasDisplay({ title, originalImage, reducedImage, manufacturerImage, meshCount, width, numColors }: CanvasDisplayProps) {
  return (
    <div className="w-full rounded-lg outline -outline-offset-1 outline-gray-200 dark:outline-white/10 overflow-hidden bg-white dark:bg-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-gray-200 dark:bg-white/10">
        <div className="bg-white dark:bg-gray-800 p-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Original</div>
          <img alt={`${title} original`} src={originalImage} className="w-full h-auto max-h-[28rem] object-contain bg-gray-50 dark:bg-gray-900" />
        </div>
        <div className="bg-white dark:bg-gray-800 p-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reduced</div>
          <img alt={`${title} reduced`} src={reducedImage ?? originalImage} className="w-full h-auto max-h-[28rem] object-contain bg-gray-50 dark:bg-gray-900" />
        </div>
        <div className="bg-white dark:bg-gray-800 p-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Manufacturer</div>
          <img alt={`${title} manufacturer`} src={manufacturerImage ?? reducedImage ?? originalImage} className="w-full h-auto max-h-[28rem] object-contain bg-gray-50 dark:bg-gray-900" />
        </div>
      </div>
      <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div><span className="font-medium">Mesh:</span> {meshCount ?? "—"}</div>
        <div><span className="font-medium">Width (in):</span> {width ?? "—"}</div>
        <div><span className="font-medium">Colors:</span> {numColors ?? "—"}</div>
      </div>
    </div>
  );
}


