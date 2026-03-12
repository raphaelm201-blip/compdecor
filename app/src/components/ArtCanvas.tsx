import {
    useRef,
    useState,
    useEffect,
    useCallback,
    MouseEvent,
    TouchEvent,
} from 'react';

interface ArtPosition {
    x: number; // 0-100 % do canvas
    y: number; // 0-100 % do canvas
}

interface CanvasProps {
    bgUrl: string | null;
    artUrl: string | null;
    artWidth: number;      // px final no canvas
    artHeight: number;     // px final no canvas
    rotation: number;      // graus
    opacity: number;       // 0-1
    position: ArtPosition;
    onPositionChange: (pos: ArtPosition) => void;
    showGrid: boolean;
    onReady: (canvas: HTMLCanvasElement) => void;
}

const CANVAS_W = 900;
const CANVAS_H = 600;

export function ArtCanvas({
    bgUrl, artUrl, artWidth, artHeight, rotation, opacity,
    position, onPositionChange, showGrid, onReady,
}: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Images cached
    const bgImgRef = useRef<HTMLImageElement | null>(null);
    const artImgRef = useRef<HTMLImageElement | null>(null);

    const [bgLoaded, setBgLoaded] = useState(false);
    const [artLoaded, setArtLoaded] = useState(false);

    // Drag state
    const dragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Load background
    useEffect(() => {
        if (!bgUrl) { bgImgRef.current = null; setBgLoaded(false); return; }
        const img = new Image();
        img.onload = () => { bgImgRef.current = img; setBgLoaded(true); };
        img.onerror = () => setBgLoaded(false);
        img.src = bgUrl;
    }, [bgUrl]);

    // Load art
    useEffect(() => {
        if (!artUrl) { artImgRef.current = null; setArtLoaded(false); return; }
        const img = new Image();
        img.onload = () => { artImgRef.current = img; setArtLoaded(true); };
        img.onerror = () => setArtLoaded(false);
        img.src = artUrl;
    }, [artUrl]);

    // Draw
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Background
        if (bgImgRef.current && bgLoaded) {
            ctx.drawImage(bgImgRef.current, 0, 0, CANVAS_W, CANVAS_H);
        } else {
            // checkerboard placeholder
            const sz = 30;
            for (let r = 0; r < CANVAS_H / sz; r++) {
                for (let c = 0; c < CANVAS_W / sz; c++) {
                    ctx.fillStyle = (r + c) % 2 === 0 ? '#13151f' : '#1a1c2b';
                    ctx.fillRect(c * sz, r * sz, sz, sz);
                }
            }
            // placeholder text
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.font = 'bold 18px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('↑  Faça upload da imagem de fundo', CANVAS_W / 2, CANVAS_H / 2);
        }

        // Grid overlay
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
            // center lines
            ctx.strokeStyle = 'rgba(108,99,255,0.15)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(CANVAS_W / 2, 0); ctx.lineTo(CANVAS_W / 2, CANVAS_H); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, CANVAS_H / 2); ctx.lineTo(CANVAS_W, CANVAS_H / 2); ctx.stroke();
            ctx.restore();
        }

        // Art
        if (artImgRef.current && artLoaded) {
            const cx = (position.x / 100) * CANVAS_W;
            const cy = (position.y / 100) * CANVAS_H;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.globalAlpha = opacity;

            // Shadow
            ctx.shadowColor = 'rgba(0,0,0,0.45)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 4;
            ctx.shadowOffsetY = 6;

            ctx.drawImage(artImgRef.current, -artWidth / 2, -artHeight / 2, artWidth, artHeight);
            ctx.restore();

            // Selection border when not dragging
            if (!dragging.current) {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate((rotation * Math.PI) / 180);
                ctx.strokeStyle = 'rgba(108,99,255,0.6)';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 3]);
                ctx.strokeRect(-artWidth / 2 - 2, -artHeight / 2 - 2, artWidth + 4, artHeight + 4);

                // corner handles
                ctx.setLineDash([]);
                ctx.fillStyle = '#fff';
                const corners = [
                    [-artWidth / 2 - 2, -artHeight / 2 - 2],
                    [artWidth / 2 + 2, -artHeight / 2 - 2],
                    [artWidth / 2 + 2, artHeight / 2 + 2],
                    [-artWidth / 2 - 2, artHeight / 2 + 2],
                ];
                for (const [hx, hy] of corners) {
                    ctx.beginPath();
                    ctx.arc(hx, hy, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();
            }
        }
    }, [bgLoaded, artLoaded, position, artWidth, artHeight, rotation, opacity, showGrid]);

    useEffect(() => {
        draw();
        const canvas = canvasRef.current;
        if (canvas) onReady(canvas);
    }, [draw, onReady]);

    // Hit test: is point (px,py) inside the art?
    const isOnArt = useCallback((px: number, py: number): boolean => {
        if (!artImgRef.current || !artLoaded) return false;
        const canvas = canvasRef.current!;
        const scale = canvas.getBoundingClientRect().width / CANVAS_W;
        const cx = (position.x / 100) * CANVAS_W * scale;
        const cy = (position.y / 100) * CANVAS_H * scale;
        const hw = (artWidth / 2 + 4) * scale;
        const hh = (artHeight / 2 + 4) * scale;
        const dx = px - cx;
        const dy = py - cy;
        const cos = Math.cos((-rotation * Math.PI) / 180);
        const sin = Math.sin((-rotation * Math.PI) / 180);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;
        return Math.abs(lx) <= hw && Math.abs(ly) <= hh;
    }, [artLoaded, position, artWidth, artHeight, rotation]);

    const clientToCanvas = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100,
        };
    };

    const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        if (!isOnArt(relX, relY)) return;
        dragging.current = true;
        dragOffset.current = {
            x: (relX / rect.width) * 100 - position.x,
            y: (relY / rect.height) * 100 - position.y,
        };
        e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
        if (!dragging.current) return;
        const pos = clientToCanvas(e.clientX, e.clientY);
        onPositionChange({
            x: Math.max(0, Math.min(100, pos.x - dragOffset.current.x)),
            y: Math.max(0, Math.min(100, pos.y - dragOffset.current.y)),
        });
    };

    const handleMouseUp = () => { dragging.current = false; };

    // Touch support
    const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
        const t = e.touches[0];
        const rect = canvasRef.current!.getBoundingClientRect();
        const relX = t.clientX - rect.left;
        const relY = t.clientY - rect.top;
        if (!isOnArt(relX, relY)) return;
        dragging.current = true;
        dragOffset.current = {
            x: (relX / rect.width) * 100 - position.x,
            y: (relY / rect.height) * 100 - position.y,
        };
        e.preventDefault();
    };

    const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
        if (!dragging.current) return;
        const t = e.touches[0];
        const pos = clientToCanvas(t.clientX, t.clientY);
        onPositionChange({
            x: Math.max(0, Math.min(100, pos.x - dragOffset.current.x)),
            y: Math.max(0, Math.min(100, pos.y - dragOffset.current.y)),
        });
        e.preventDefault();
    };

    const handleTouchEnd = () => { dragging.current = false; };

    const handleMouseEnter = (e: MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        if (artLoaded && isOnArt(relX, relY)) {
            canvasRef.current!.style.cursor = 'move';
        }
    };

    const handleMouseMoveForCursor = (e: MouseEvent<HTMLCanvasElement>) => {
        if (dragging.current) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        canvasRef.current!.style.cursor =
            artLoaded && isOnArt(relX, relY) ? 'move' : 'default';
    };

    return (
        <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
                maxWidth: '100%', maxHeight: '100%', display: 'block',
                boxShadow: '0 8px 48px rgba(0,0,0,0.5)'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => { handleMouseMove(e); handleMouseMoveForCursor(e); }}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseEnter={handleMouseEnter}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        />
    );
}
