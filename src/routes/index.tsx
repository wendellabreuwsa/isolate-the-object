import { createFileRoute } from "@tanstack/react-router";
import { Download, ImagePlus, Images, RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import demoAsset from "@/assets/orion-foguete-exemplo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type BackgroundColor = { r: number; g: number; b: number };
type ImageItem = {
  id: string;
  name: string;
  url: string;
  width?: number;
  height?: number;
  tolerance: number;
  background: BackgroundColor;
  isDemo?: boolean;
};

const WHITE: BackgroundColor = { r: 255, g: 255, b: 255 };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Recorte — Remover fundo de imagem" },
      { name: "description", content: "Importe imagens, remova fundos uniformes e baixe PNGs transparentes." },
      { property: "og:title", content: "Recorte — Remover fundo de imagem" },
      { property: "og:description", content: "Remova fundos uniformes e exporte PNGs transparentes diretamente no navegador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BackgroundRemover,
});

function toHex(color: BackgroundColor) {
  return `#${[color.r, color.g, color.b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function fromHex(value: string): BackgroundColor {
  return {
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  };
}

function detectBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  const insetX = Math.min(2, width - 1);
  const insetY = Math.min(2, height - 1);
  const points: Array<[number, number]> = [[insetX, insetY], [width - 1 - insetX, insetY], [insetX, height - 1 - insetY], [width - 1 - insetX, height - 1 - insetY]];
  const totals = points.reduce<[number, number, number]>((sum, [x, y]) => {
    const pixel = context.getImageData(x, y, 1, 1).data;
    return [sum[0] + (pixel[0] ?? 0), sum[1] + (pixel[1] ?? 0), sum[2] + (pixel[2] ?? 0)];
  }, [0, 0, 0]);
  return { r: Math.round(totals[0] / 4), g: Math.round(totals[1] / 4), b: Math.round(totals[2] / 4) };
}

function BackgroundRemover() {
  const [items, setItems] = useState<ImageItem[]>([{
    id: "demo-orion",
    name: "orion-foguete-exemplo.png",
    url: demoAsset.url,
    tolerance: 24,
    background: WHITE,
    isDemo: true,
  }]);
  const [activeId, setActiveId] = useState("demo-orion");
  const [view, setView] = useState<"result" | "original">("result");
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState("Processando imagem...");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const active = items.find((item) => item.id === activeId) ?? items[0];

  const processImage = useCallback((item: ImageItem, detect = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setStatus("Processando imagem...");
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      const selectedBackground = detect ? detectBackground(context, canvas.width, canvas.height) : item.background;
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const fadeRange = Math.max(8, item.tolerance * 0.45);
      for (let index = 0; index < data.length; index += 4) {
        const red = data[index] ?? 0;
        const green = data[index + 1] ?? 0;
        const blue = data[index + 2] ?? 0;
        const alpha = data[index + 3] ?? 255;
        const distance = Math.sqrt(
          (red - selectedBackground.r) ** 2 +
          (green - selectedBackground.g) ** 2 +
          (blue - selectedBackground.b) ** 2,
        );
        if (distance <= item.tolerance) data[index + 3] = 0;
        else if (distance <= item.tolerance + fadeRange) {
          data[index + 3] = Math.round(alpha * ((distance - item.tolerance) / fadeRange));
        }
      }
      context.putImageData(imageData, 0, 0);
      setItems((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, width: image.naturalWidth, height: image.naturalHeight, background: selectedBackground }
        : entry));
      setStatus("Fundo removido");
    };
    image.onerror = () => setStatus("Não foi possível abrir esta imagem");
    image.src = item.url;
  }, []);

  useEffect(() => {
    if (active) processImage(active, active.width === undefined);
  }, [active?.id, active?.tolerance, active?.background.r, active?.background.g, active?.background.b, processImage]);

  const importFiles = (files: FileList | File[]) => {
    const accepted = Array.from(files).filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type));
    if (!accepted.length) return;
    const newItems = accepted.map((file) => ({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      tolerance: 24,
      background: WHITE,
    }));
    const firstItem = newItems[0];
    if (!firstItem) return;
    setItems((current) => [...current.filter((item) => !item.isDemo), ...newItems]);
    setActiveId(firstItem.id);
    setView("result");
  };

  const updateActive = (changes: Partial<ImageItem>) => {
    if (!active) return;
    setItems((current) => current.map((item) => item.id === active.id ? { ...item, ...changes } : item));
  };

  const removeItem = (id: string) => {
    const remaining = items.filter((item) => item.id !== id);
    setItems(remaining);
    if (activeId === id) setActiveId(remaining[0]?.id ?? "");
  };

  const download = () => {
    if (!active || !canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${active.name.replace(/\.[^.]+$/, "")}-sem-fundo.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(event) => event.target.files && importFiles(event.target.files)} />
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><Sparkles className="size-4" /></div>
          <div><h1 className="text-base font-semibold leading-none">Recorte</h1><p className="mt-1 text-xs text-muted-foreground">Removedor de fundo</p></div>
        </div>
        <Button onClick={() => fileInputRef.current?.click()}><ImagePlus /> <span className="hidden sm:inline">Importar imagens</span><span className="sm:hidden">Importar</span></Button>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
        <aside className="order-2 border-t border-border bg-card p-4 lg:order-none lg:border-r lg:border-t-0">
          <div className="mb-4 flex items-center justify-between"><p className="text-xs font-semibold uppercase text-muted-foreground">Imagens</p><span className="font-mono text-xs text-muted-foreground">{items.length}</span></div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {items.map((item) => (
              <button key={item.id} onClick={() => setActiveId(item.id)} className={`group flex min-w-0 items-center gap-3 rounded-md border p-2 text-left transition-colors ${item.id === activeId ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"}`}>
                <span className="transparency-grid grid size-12 shrink-0 place-items-center overflow-hidden rounded"><img src={item.url} alt="" className="max-h-full max-w-full object-contain" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{item.name}</span><span className="mt-1 block font-mono text-[10px] text-muted-foreground">{item.width ? `${item.width} × ${item.height}` : "Carregando"}</span></span>
                <span role="button" tabIndex={0} aria-label={`Remover ${item.name}`} onClick={(event) => { event.stopPropagation(); removeItem(item.id); }} onKeyDown={(event) => event.key === "Enter" && removeItem(item.id)} className="grid size-6 place-items-center rounded text-muted-foreground opacity-0 hover:bg-secondary hover:text-foreground group-hover:opacity-100"><X className="size-3.5" /></span>
              </button>
            ))}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"><Upload className="size-4" /> Adicionar arquivos</button>
        </aside>

        <section className="order-1 flex min-h-[540px] min-w-0 flex-col bg-workspace lg:order-none" onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }} onDrop={(event) => { event.preventDefault(); setIsDragging(false); importFiles(event.dataTransfer.files); }}>
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="flex rounded-md bg-card p-1">
              <Button variant={view === "original" ? "secondary" : "ghost"} size="sm" onClick={() => setView("original")}>Original</Button>
              <Button variant={view === "result" ? "secondary" : "ghost"} size="sm" onClick={() => setView("result")}>Resultado</Button>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-success" /> Processamento local</span>
          </div>
          <div className={`relative flex flex-1 items-center justify-center overflow-hidden p-6 md:p-10 ${view === "result" ? "transparency-grid" : "bg-elevated"}`}>
            {active ? (
              <div className="flex h-full max-h-[68vh] w-full items-center justify-center">
                <img src={active.url} alt={`Imagem original: ${active.name}`} className={`${view === "original" ? "block" : "hidden"} max-h-full max-w-full object-contain drop-shadow-2xl`} />
                <canvas ref={canvasRef} aria-label={`Resultado sem fundo: ${active.name}`} className={`${view === "result" ? "block" : "hidden"} max-h-full max-w-full object-contain drop-shadow-2xl`} />
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-muted-foreground"><Images className="mb-4 size-10" /><span className="font-medium text-foreground">Importe uma imagem</span><span className="mt-1 text-sm">PNG, JPG ou WebP</span></button>
            )}
            {isDragging && <div className="absolute inset-4 grid place-items-center rounded-md border-2 border-dashed border-primary bg-background/90"><div className="text-center"><Upload className="mx-auto mb-3 size-8 text-primary" /><p className="font-semibold">Solte para importar</p></div></div>}
          </div>
          <div className="flex h-10 items-center justify-between border-t border-border bg-card px-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-success" />{status}</span><span className="font-mono">{active?.width ? `${active.width} × ${active.height} px` : "—"}</span></div>
        </section>

        <aside className="relative order-3 border-t border-border bg-card pb-32 lg:border-l lg:border-t-0">
          <div className="flex h-14 items-center gap-2 border-b border-border px-5"><SlidersHorizontal className="size-4 text-primary" /><h2 className="text-sm font-semibold">Ajustes</h2></div>
          <div className="space-y-7 p-5">
            <div><div className="mb-3 flex items-center justify-between"><label htmlFor="background-color" className="text-sm font-medium">Cor do fundo</label><span className="font-mono text-xs text-muted-foreground">{active ? toHex(active.background).toUpperCase() : "—"}</span></div><label className="flex h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-3"><input id="background-color" type="color" value={active ? toHex(active.background) : "#ffffff"} disabled={!active} onChange={(event) => updateActive({ background: fromHex(event.target.value) })} className="size-6 cursor-pointer rounded border-0 bg-transparent p-0" /><span className="text-xs text-muted-foreground">Clique para alterar</span></label><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Detectada automaticamente pelos cantos da imagem.</p></div>
            <div><div className="mb-4 flex items-center justify-between"><label htmlFor="tolerance" className="text-sm font-medium">Tolerância</label><span className="rounded bg-secondary px-2 py-1 font-mono text-xs text-primary">{active?.tolerance ?? 0}</span></div><Slider id="tolerance" min={0} max={120} step={1} value={[active?.tolerance ?? 0]} disabled={!active} onValueChange={(values) => { const value = values[0]; if (value !== undefined) updateActive({ tolerance: value }); }} /><div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground"><span>PRECISO</span><span>AMPLO</span></div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Aumente se ainda houver resíduos do fundo. Diminua para preservar detalhes claros.</p></div>
            <div className="border-t border-border pt-5"><Button variant="outline" className="w-full" disabled={!active} onClick={() => updateActive({ tolerance: 24, background: WHITE })}><RotateCcw /> Restaurar ajustes</Button></div>
          </div>
          <div className="border-t border-border p-5 lg:absolute lg:bottom-0 lg:w-[300px]"><Button size="lg" className="w-full" disabled={!active} onClick={download}><Download /> Baixar PNG transparente</Button><p className="mt-3 text-center text-[11px] text-muted-foreground">A imagem mantém o tamanho original</p></div>
        </aside>
      </div>
    </main>
  );
}