import {
    useRef,
    useEffect,
    useCallback,
    MouseEvent,
    TouchEvent,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FrameItem {
    id: string;
    artUrl: string;
    x: number;        // 0-100% do canvas
    y: number;        // 0-100% do canvas
    width: number;    // px no canvas
    height: number;   // px no canvas
    rotation: number; // graus
    opacity: number;  // 0-1
    titulo: string;
    preco: number;
}

interface CanvasProps {
    bgUrl: string | null;
    frames: FrameItem[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onMove: (id: string, x: number, y: number) => void;
    onResize: (id: string, width: number, height: number) => void;
    onDelete: (id: string) => void;
    showGrid: boolean;
    onReady: (canvas: HTMLCanvasElement) => void;
}

const CANVAS_W = 900;
const CANVAS_H = 600;
const HANDLE_R = 6; // raio dos handles de resize (px no canvas)

// ─── Image cache ──────────────────────────────────────────────────────────────
const imgCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
    if (imgCache.has(src)) return Promise.resolve(imgCache.get(src)!);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { imgCache.set(src, img); resolve(img); };
        img.onerror = reject;
        img.src = src;
    });
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ArtCanvas({
    bgUrl, frames, selectedId,
    onSelect, onMove, onResize, onDelete,
    showGrid, onReady,
}: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
    const bgImgRef = useRef<HTMLImageElement | null>(null);

    // Drag state
    const dragState = useRef<{
        type: 'move' | 'resize-se' | 'resize-sw' | 'resize-ne' | 'resize-nw';
        id: string;
        startX: number; startY: number;
        origX: number; origY: number;
        origW: number; origH: number;
    } | null>(null);

    // ── Load BG ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!bgUrl) { bgImgRef.current = null; return; }
        loadImage(bgUrl).then(img => { bgImgRef.current = img; draw(); }).catch(() => {});
    }, [bgUrl]);

    // ── Load art images ────────────────────────────────────────────────────────
    useEffect(() => {
        Promise.all(
            frames.map(f =>
                loadImage(f.artUrl).then(img => {
                    imagesRef.current.set(f.artUrl, img);
                })
            )
        ).then(() => draw());
    }, [frames.map(f => f.artUrl).join(',')]);

    // ── Draw ──────────────────────────────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Background
        if (bgImgRef.current) {
            ctx.drawImage(bgImgRef.current, 0, 0, CANVAS_W, CANVAS_H);
        } else {
            const sz = 30;
            for (let r = 0; r < CANVAS_H / sz; r++) {
                for (let c = 0; c < CANVAS_W / sz; c++) {
                    ctx.fillStyle = (r + c) % 2 === 0 ? '#13151f' : '#1a1c2b';
                    ctx.fillRect(c * sz, r * sz, sz, sz);
                }
            }
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.font = 'bold 16px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('↑  Faça upload da imagem de fundo', CANVAS_W / 2, CANVAS_H / 2);
        }

        // Grid
        if (showGrid) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            const step = 60;
            for (let x = 0; x <= CANVAS_W; x += step) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
            }
            for (let y = 0; y <= CANVAS_H; y += step) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(108,99,255,0.15)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(CANVAS_W / 2, 0); ctx.lineTo(CANVAS_W / 2, CANVAS_H); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, CANVAS_H / 2); ctx.lineTo(CANVAS_W, CANVAS_H / 2); ctx.stroke();
            ctx.restore();
        }

        // Frames (não-selecionados primeiro, selecionado por cima)
        const sorted = [...frames].sort(a => a.id === selectedId ? 1 : -1);

        for (const frame of sorted) {
            const img = imagesRef.current.get(frame.artUrl);
            if (!img) continue;

            const cx = (frame.x / 100) * CANVAS_W;
            const cy = (frame.y / 100) * CANVAS_H;
            const hw = frame.width / 2;
            const hh = frame.height / 2;
            const isSelected = frame.id === selectedId;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate((frame.rotation * Math.PI) / 180);
            ctx.globalAlpha = frame.opacity;

            // Sombra
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = isSelected ? 28 : 16;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 6;

            // Moldura simples
            ctx.fillStyle = '#1a1208';
            ctx.fillRect(-hw - 8, -hh - 8, frame.width + 16, frame.height + 16);

            ctx.shadowColor = 'transparent';
            ctx.drawImage(img, -hw, -hh, frame.width, frame.height);
            ctx.restore();

            // Selection UI
            if (isSelected) {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate((frame.rotation * Math.PI) / 180);

                // Borda de seleção
                ctx.strokeStyle = 'rgba(108,99,255,0.85)';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 3]);
                ctx.strokeRect(-hw - 10, -hh - 10, frame.width + 20, frame.height + 20);
                ctx.setLineDash([]);

                // Handles de resize nos 4 cantos
                const handles = getHandlePositions(frame);
                for (const h of handles) {
                    ctx.fillStyle = '#fff';
                    ctx.strokeStyle = 'rgba(108,99,255,0.9)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(h.lx, h.ly, HANDLE_R, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }

                // Botão deletar (X) no canto superior direito
                const delX = hw + 10 + 14;
                const delY = -hh - 10 - 14;
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(delX, delY, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✕', delX, delY);

                ctx.restore();

                // Label flutuante com título e preço
                if (frame.titulo || frame.preco > 0) {
                    const labelX = cx;
                    const labelY = cy + hh + 10 + 22;
                    const label = [
                        frame.titulo,
                        frame.preco > 0
                            ? frame.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : ''
                    ].filter(Boolean).join(' · ');

                    ctx.font = '12px Inter, sans-serif';
                    const tw = ctx.measureText(label).width;
                    const pad = 10;

                    ctx.fillStyle = 'rgba(13,15,20,0.85)';
                    roundRect(ctx, labelX - tw / 2 - pad, labelY - 13, tw + pad * 2, 22, 6);
                    ctx.fill();

                    ctx.fillStyle = 'rgba(255,255,255,0.9)';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(label, labelX, labelY);
                }
            }
        }

        if (canvasRef.current) onReady(canvasRef.current);
    }, [frames, selectedId, showGrid, bgUrl, onReady]);

    useEffect(() => { draw(); }, [draw]);

    // ── Handle positions in LOCAL (rotated) space ──────────────────────────────
    function getHandlePositions(frame: FrameItem) {
        const hw = frame.width / 2 + 10;
        const hh = frame.height / 2 + 10;
        return [
            { corner: 'se' as const, lx: hw, ly: hh },
            { corner: 'sw' as const, lx: -hw, ly: hh },
            { corner: 'ne' as const, lx: hw, ly: -hh },
            { corner: 'nw' as const, lx: -hw, ly: -hh },
        ];
    }

    // ── Canvas coordinate helpers ──────────────────────────────────────────────
    const clientToCanvasPx = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        return {
            px: (clientX - rect.left) * scaleX,
            py: (clientY - rect.top) * scaleY,
        };
    };

    // ── Hit tests ─────────────────────────────────────────────────────────────
    type HitResult =
        | { type: 'delete'; id: string }
        | { type: 'resize-se' | 'resize-sw' | 'resize-ne' | 'resize-nw'; id: string }
        | { type: 'move'; id: string }
        | null;

    const hitTest = (px: number, py: number): HitResult => {
        // Check selected frame first (on top)
        const order = selectedId
            ? [frames.find(f => f.id === selectedId)!, ...frames.filter(f => f.id !== selectedId)]
            : [...frames].reverse();

        for (const frame of order) {
            if (!imagesRef.current.has(frame.artUrl)) continue;

            const cx = (frame.x / 100) * CANVAS_W;
            const cy = (frame.y / 100) * CANVAS_H;
            const cos = Math.cos((-frame.rotation * Math.PI) / 180);
            const sin = Math.sin((-frame.rotation * Math.PI) / 180);
            const dx = px - cx;
            const dy = py - cy;
            // Rotate point into local space
            const lx = dx * cos - dy * sin;
            const ly = dx * sin + dy * cos;

            const hw = frame.width / 2;
            const hh = frame.height / 2;

            if (frame.id === selectedId) {
                // Delete button
                const delLx = hw + 10 + 14;
                const delLy = -hh - 10 - 14;
                if (Math.hypot(lx - delLx, ly - delLy) <= 12) {
                    return { type: 'delete', id: frame.id };
                }

                // Resize handles
                const handles = getHandlePositions(frame);
                for (const h of handles) {
                    if (Math.hypot(lx - h.lx, ly - h.ly) <= HANDLE_R + 4) {
                        return { type: `resize-${h.corner}`, id: frame.id };
                    }
                }
            }

            // Move (interior)
            if (Math.abs(lx) <= hw + 10 && Math.abs(ly) <= hh + 10) {
                return { type: 'move', id: frame.id };
            }
        }
        return null;
    };

    // ── Pointer down ──────────────────────────────────────────────────────────
    const handlePointerDown = (clientX: number, clientY: number) => {
        const { px, py } = clientToCanvasPx(clientX, clientY);
        const hit = hitTest(px, py);

        if (!hit) { onSelect(null); return; }

        if (hit.type === 'delete') {
            onDelete(hit.id);
            return;
        }

        onSelect(hit.id);
        const frame = frames.find(f => f.id === hit.id)!;

        dragState.current = {
            type: hit.type,
            id: hit.id,
            startX: px, startY: py,
            origX: frame.x, origY: frame.y,
            origW: frame.width, origH: frame.height,
        };
    };

    // ── Pointer move ──────────────────────────────────────────────────────────
    const handlePointerMove = (clientX: number, clientY: number) => {
        const ds = dragState.current;
        if (!ds) {
            // Cursor feedback
            const { px, py } = clientToCanvasPx(clientX, clientY);
            const hit = hitTest(px, py);
            const canvas = canvasRef.current!;
            if (!hit) canvas.style.cursor = 'default';
            else if (hit.type === 'delete') canvas.style.cursor = 'pointer';
            else if (hit.type === 'move') canvas.style.cursor = 'move';
            else canvas.style.cursor = 'nwse-resize';
            return;
        }

        const { px, py } = clientToCanvasPx(clientX, clientY);
        const ddx = px - ds.startX;
        const ddy = py - ds.startY;

        if (ds.type === 'move') {
            const nx = Math.max(0, Math.min(100, ds.origX + (ddx / CANVAS_W) * 100));
            const ny = Math.max(0, Math.min(100, ds.origY + (ddy / CANVAS_H) * 100));
            onMove(ds.id, nx, ny);
        } else {
            // Resize: delta de distância do centro
            const frame = frames.find(f => f.id === ds.id)!;
            const aspect = ds.origW / ds.origH;

            // usa apenas ddx para simplificar resize proporcional
            let newW = Math.max(40, ds.origW + ddx * 2);
            let newH = Math.round(newW / aspect);

            // para handles W (esquerda) o delta é invertido
            if (ds.type === 'resize-sw' || ds.type === 'resize-nw') {
                newW = Math.max(40, ds.origW - ddx * 2);
                newH = Math.round(newW / aspect);
            }

            onResize(ds.id, Math.min(newW, 880), Math.min(newH, 580));
        }
    };

    const handlePointerUp = () => { dragState.current = null; };

    // ── Mouse events ──────────────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
        handlePointerDown(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
        handlePointerMove(e.clientX, e.clientY);
    };

    // ── Touch events ──────────────────────────────────────────────────────────
    const onTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
        const t = e.touches[0];
        handlePointerDown(t.clientX, t.clientY);
        e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
        const t = e.touches[0];
        handlePointerMove(t.clientX, t.clientY);
        e.preventDefault();
    };

    return (
        <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', boxShadow: '0 8px 48px rgba(0,0,0,0.5)' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={handlePointerUp}
        />
    );
}

// ── Helper: arredonda rect no canvas ──────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
