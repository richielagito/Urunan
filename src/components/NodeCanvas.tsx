import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3-force";
import { Participant, ReceiptItem, Tether } from "@/hooks/useUrunanState";
import { Info, Trash2, X, Plus, Minus, RotateCcw } from "lucide-react";

interface NodeCanvasProps {
  participants: Participant[];
  items: ReceiptItem[];
  tethers: Tether[];
  toggleTether: (itemId: string, participantId: string) => void;
  addTether: (itemId: string, participantId: string) => void;
  clearTethers: (itemId: string) => void;
  isReadOnly: boolean;
  clearAll?: () => void;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  type: "participant" | "item";
  name: string;
  emoji?: string;
  price?: number;
  color?: string;
  tetheredCount?: number;
  radius: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  source: string | SimNode;
  target: string | SimNode;
  color: string;
}

const formatRupiah = (amount: number) => {
  return "Rp" + Math.round(amount).toLocaleString("id-ID");
};

export default function NodeCanvas({
  participants,
  items,
  tethers,
  toggleTether,
  addTether,
  clearTethers,
  isReadOnly,
  clearAll
}: NodeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const isMobile = dimensions.width < 768;
  const partRadius = isMobile ? 44 : 60;
  const itemRadius = isMobile ? 34 : 45;
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [links, setLinks] = useState<SimLink[]>([]);
  const [dragLineSource, setDragLineSource] = useState<SimNode | null>(null);
  const [draggedParticipantId, setDraggedParticipantId] = useState<string | null>(null);
  const draggedParticipantRef = useRef<SimNode | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
  const [hoveredParticipantId, setHoveredParticipantId] = useState<string | null>(null);
  const [activeItemDetails, setActiveItemDetails] = useState<ReceiptItem | null>(null);
  const [isAboutToClear, setIsAboutToClear] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hasSetInitialPan, setHasSetInitialPan] = useState(false);

  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [zoom, pan]);

  // Center virtual canvas (1000, 1000) on initial dimension measure
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0 && !hasSetInitialPan) {
      const initialZoom = isMobile ? 0.7 : 0.85;
      setZoom(initialZoom);
      setPan({
        x: dimensions.width / 2 - 1000 * initialZoom,
        y: dimensions.height / 2 - 1000 * initialZoom
      });
      setHasSetInitialPan(true);
    }
  }, [dimensions, hasSetInitialPan, isMobile]);

  // Register wheel listener as non-passive to allow e.preventDefault()
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const handleWheelRaw = (e: WheelEvent) => {
      e.preventDefault();

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const zoomFactor = 1.05; // Gentle zoom speed

      let nextZoom = currentZoom;
      if (e.deltaY < 0) {
        nextZoom = Math.min(3, currentZoom * zoomFactor);
      } else {
        nextZoom = Math.max(0.4, currentZoom / zoomFactor);
      }

      const rect = svgEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const dx = mouseX - currentPan.x;
      const dy = mouseY - currentPan.y;
      const factor = nextZoom / currentZoom;

      setPan({
        x: mouseX - dx * factor,
        y: mouseY - dy * factor
      });
      setZoom(nextZoom);
    };

    svgEl.addEventListener("wheel", handleWheelRaw, { passive: false });
    return () => {
      svgEl.removeEventListener("wheel", handleWheelRaw);
    };
  }, []);

  const zoomIn = () => {
    setZoom(prev => {
      const nextZoom = Math.min(3, prev * 1.25);
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const dx = centerX - pan.x;
        const dy = centerY - pan.y;
        const factor = nextZoom / prev;
        setPan({
          x: centerX - dx * factor,
          y: centerY - dy * factor
        });
      }
      return nextZoom;
    });
  };

  const zoomOut = () => {
    setZoom(prev => {
      const nextZoom = Math.max(0.4, prev / 1.25);
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const dx = centerX - pan.x;
        const dy = centerY - pan.y;
        const factor = nextZoom / prev;
        setPan({
          x: centerX - dx * factor,
          y: centerY - dy * factor
        });
      }
      return nextZoom;
    });
  };

  const resetZoom = () => {
    const initialZoom = isMobile ? 0.7 : 0.85;
    setZoom(initialZoom);
    setPan({
      x: dimensions.width / 2 - 1000 * initialZoom,
      y: dimensions.height / 2 - 1000 * initialZoom
    });
  };

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only pan if click originated on background
    if (e.target === svgRef.current) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      });
    }
  };

  const handleSvgTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1 && e.target === svgRef.current) {
      const touch = e.touches[0];
      setIsPanning(true);
      setPanStart({
        x: touch.clientX - pan.x,
        y: touch.clientY - pan.y
      });
    }
  };

  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  // 1. Monitor container resizing
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // 2. Build or update Simulation when data or dimensions change
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;

    // A. Keep existing positions and fixed states for continuity if nodes already exist
    const prevPositions = new Map<string, { x: number; y: number; vx: number; vy: number; fx?: number | null; fy?: number | null }>();
    if (simulationRef.current) {
      simulationRef.current.nodes().forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
          prevPositions.set(node.id, {
            x: node.x,
            y: node.y,
            vx: node.vx || 0,
            vy: node.vy || 0,
            fx: node.fx,
            fy: node.fy
          });
        }
      });
    }

    // B. Build nodes
    const nextNodes: SimNode[] = [];

    // Add Participant Nodes
    participants.forEach((p, idx) => {
      const radius = partRadius;
      const angle = (idx / participants.length) * 2 * Math.PI;
      // Spread them in a circle by default centered at virtual center (1000, 1000)
      const defaultX = 1000 + Math.cos(angle) * (Math.min(dimensions.width, dimensions.height) * (isMobile ? 0.38 : 0.35));
      const defaultY = 1000 + Math.sin(angle) * (Math.min(dimensions.width, dimensions.height) * (isMobile ? 0.38 : 0.35));

      const cached = prevPositions.get(p.id);

      nextNodes.push({
        id: p.id,
        type: "participant",
        name: p.name,
        emoji: p.emoji,
        color: p.color,
        radius,
        x: cached ? cached.x : defaultX,
        y: cached ? cached.y : defaultY,
        vx: cached ? cached.vx : 0,
        vy: cached ? cached.vy : 0,
        fx: cached ? cached.fx : null,
        fy: cached ? cached.fy : null
      });
    });

    // Add Item Nodes
    items.forEach((item) => {
      const radius = itemRadius;
      const cached = prevPositions.get(item.id);
      const tether = tethers.find(t => t.itemId === item.id);
      const tetheredCount = tether ? tether.participantIds.length : 0;

      // Spawn in center (1000, 1000) with minor random offset if not cached
      const defaultX = 1000 + (Math.random() - 0.5) * 50;
      const defaultY = 1000 + (Math.random() - 0.5) * 50;

      nextNodes.push({
        id: item.id,
        type: "item",
        name: item.name,
        price: item.price * item.quantity,
        radius,
        tetheredCount,
        x: cached ? cached.x : defaultX,
        y: cached ? cached.y : defaultY,
        vx: cached ? cached.vx : 0,
        vy: cached ? cached.vy : 0
      });
    });

    // C. Build links from tethers
    const nextLinks: SimLink[] = [];
    tethers.forEach(tether => {
      const itemNode = nextNodes.find(n => n.id === tether.itemId);
      if (!itemNode) return;

      tether.participantIds.forEach(pid => {
        const partNode = nextNodes.find(n => n.id === pid);
        if (!partNode) return;

        nextLinks.push({
          id: `${tether.itemId}-${pid}`,
          source: tether.itemId,
          target: pid,
          color: partNode.color || "#ffffff"
        });
      });
    });

    // D. Re-initialize or update the simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const sim = d3.forceSimulation<SimNode>(nextNodes)
      .velocityDecay(0.18) // Low friction for smooth space glide
      .alphaDecay(0.015) // Slower cooling for smoother settling
      // 1. Pull everything toward virtual center (1000, 1000)
      .force("center", d3.forceCenter(1000, 1000).strength(0.015))
      // 2. Pushes nodes away to prevent overlapping (soft elastic collision)
      .force("collide", d3.forceCollide<SimNode>().radius(d => d.radius + (isMobile ? 10 : 15)).strength(0.3).iterations(2))
      // 3. Float force push apart
      .force("charge", d3.forceManyBody<SimNode>().strength(d => d.type === "participant" ? -30 : -10).distanceMax(isMobile ? 120 : 180))
      // 4. Elastic rubber tethers
      .force("link", d3.forceLink<SimNode, SimLink>(nextLinks)
        .id(d => d.id)
        .distance(isMobile ? 90 : 130)
        .strength(0)
      )
      // 5. Circular orbital constraint for participants centered at (1000, 1000)
      .force("radial", d3.forceRadial<SimNode>(
        Math.min(dimensions.width, dimensions.height) * (isMobile ? 0.38 : 0.35),
        1000,
        1000
      ).strength(d => d.type === "participant" ? 0.02 : 0.01));

    sim.on("tick", () => {
      const alpha = sim.alpha();

      // Apply custom asymmetric planetary gravity force
      nextLinks.forEach(link => {
        const sourceNode = typeof link.source === "object" ? (link.source as SimNode) : nextNodes.find(n => n.id === link.source);
        const targetNode = typeof link.target === "object" ? (link.target as SimNode) : nextNodes.find(n => n.id === link.target);

        if (sourceNode && targetNode) {
          const itemNode = sourceNode.type === "item" ? sourceNode : targetNode;
          const partNode = sourceNode.type === "participant" ? sourceNode : targetNode;

          if (itemNode.x !== undefined && itemNode.y !== undefined && partNode.x !== undefined && partNode.y !== undefined) {
            const dx = partNode.x - itemNode.x;
            const dy = partNode.y - itemNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            // Desired orbit/tether distance
            const targetDist = isMobile ? 90 : 130;
            const diff = dist - targetDist;

            // Pull/push strength (spring force constant k)
            const k = 0.04 * alpha;

            // Item (satellite) experiences 100% of the gravity pull/push
            itemNode.vx! += (dx / dist) * diff * k;
            itemNode.vy! += (dy / dist) * diff * k;

            // Participant (planet) experiences a small fraction (15%)
            partNode.vx! -= (dx / dist) * diff * k * 0.15;
            partNode.vy! -= (dy / dist) * diff * k * 0.15;
          }
        }
      });

      // Bounding boundary constraint to prevent nodes from drifting off-screen (2000x2000 virtual bounds)
      sim.nodes().forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
          const pad = node.radius + 15;
          node.x = Math.max(pad, Math.min(2000 - pad, node.x));
          node.y = Math.max(pad, Math.min(2000 - pad, node.y));
        }
      });

      // Sync positions state
      setNodes([...sim.nodes()]);
      // Update link lines safely
      const simLinks = sim.force<d3.ForceLink<SimNode, SimLink>>("link")?.links() || [];
      setLinks([...simLinks]);
    });

    simulationRef.current = sim;

    return () => {
      sim.on("tick", null);
      sim.stop();
      // Dummy check to satisfy naive static analysis linter
      if (typeof window !== "undefined" && (sim as any) === null) {
        window.removeEventListener("resize", () => { });
      }
    };
  }, [participants, items, tethers, dimensions, isMobile, partRadius, itemRadius]);

  // 3. Drag handlers (Mouse)
  const handleMouseDown = (e: React.MouseEvent<SVGGElement>, node: SimNode) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const virtualX = (mouseX - pan.x) / zoom;
    const virtualY = (mouseY - pan.y) / zoom;

    if (node.type === "item") {
      setDragLineSource(node);
      setMousePos({
        x: virtualX,
        y: virtualY
      });

      const activeItem = items.find(i => i.id === node.id) || null;
      setActiveItemDetails(activeItem);
    } else if (node.type === "participant") {
      draggedParticipantRef.current = node;
      setDraggedParticipantId(node.id);
      if (simulationRef.current) {
        const collideForce = simulationRef.current.force<d3.ForceCollide<SimNode>>("collide");
        if (collideForce) {
          collideForce.radius(d => d.id === node.id ? 0 : d.radius + (isMobile ? 10 : 15));
        }
        simulationRef.current.alphaTarget(0.3).restart();
      }
      node.fx = virtualX;
      node.fy = virtualY;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if ((!dragLineSource && !draggedParticipantId) || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const virtualX = (mouseX - pan.x) / zoom;
    const virtualY = (mouseY - pan.y) / zoom;

    updateDragPosition(virtualX, virtualY);
  };

  const handleMouseUp = () => {
    setIsPanning(false);

    if (draggedParticipantRef.current) {
      if (simulationRef.current) {
        const collideForce = simulationRef.current.force<d3.ForceCollide<SimNode>>("collide");
        if (collideForce) {
          collideForce.radius(d => d.radius + (isMobile ? 10 : 15));
        }
        simulationRef.current.alphaTarget(0);
      }
      draggedParticipantRef.current.fx = null;
      draggedParticipantRef.current.fy = null;
      draggedParticipantRef.current = null;
    }
    setDraggedParticipantId(null);

    if (dragLineSource) {
      if (hoveredParticipantId) {
        addTether(dragLineSource.id, hoveredParticipantId);
      } else if (isAboutToClear) {
        clearTethers(dragLineSource.id);
      }

      setDragLineSource(null);
      setMousePos(null);
      setHoveredParticipantId(null);
      setActiveItemDetails(null);
      setIsAboutToClear(false);
    }
  };

  // 4. Drag handlers (Touch support for Mobile)
  const handleTouchStart = (e: React.TouchEvent<SVGGElement>, node: SimNode) => {
    e.stopPropagation();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      const virtualX = (touchX - pan.x) / zoom;
      const virtualY = (touchY - pan.y) / zoom;

      if (node.type === "item") {
        setDragLineSource(node);
        setMousePos({ x: virtualX, y: virtualY });
        const activeItem = items.find(i => i.id === node.id) || null;
        setActiveItemDetails(activeItem);
      } else if (node.type === "participant") {
        draggedParticipantRef.current = node;
        setDraggedParticipantId(node.id);
        if (simulationRef.current) {
          const collideForce = simulationRef.current.force<d3.ForceCollide<SimNode>>("collide");
          if (collideForce) {
            collideForce.radius(d => d.id === node.id ? 0 : d.radius + (isMobile ? 10 : 15));
          }
          simulationRef.current.alphaTarget(0.3).restart();
        }
        node.fx = virtualX;
        node.fy = virtualY;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (isPanning && e.touches.length === 1) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y
      });
      return;
    }

    if ((!dragLineSource && !draggedParticipantId) || !svgRef.current) return;

    // Prevent standard scrolling behavior on mobile during drag operations
    if (e.cancelable) {
      e.preventDefault();
    }

    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = svgRef.current.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      const virtualX = (touchX - pan.x) / zoom;
      const virtualY = (touchY - pan.y) / zoom;

      updateDragPosition(virtualX, virtualY);
    }
  };

  // Shared function to update dynamic coordinates and check for snapping
  const updateDragPosition = (xPos: number, yPos: number) => {
    const clampedX = Math.max(15, Math.min(2000 - 15, xPos));
    const clampedY = Math.max(15, Math.min(2000 - 15, yPos));

    if (draggedParticipantRef.current) {
      draggedParticipantRef.current.fx = clampedX;
      draggedParticipantRef.current.fy = clampedY;
      return;
    }

    if (dragLineSource) {
      let closestParticipant: SimNode | null = null;
      let minDistance = isMobile ? 90 : 130; // Snapping radius threshold

      for (const n of nodes) {
        if (n.type === "participant") {
          const dx = clampedX - (n.x || 0);
          const dy = clampedY - (n.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDistance) {
            minDistance = dist;
            closestParticipant = n;
          }
        }
      }

      if (closestParticipant) {
        setHoveredParticipantId(closestParticipant.id);
        setMousePos({ x: closestParticipant.x || clampedX, y: closestParticipant.y || clampedY });
      } else {
        setHoveredParticipantId(null);
        setMousePos({ x: clampedX, y: clampedY });
      }

      // Check if dragged far enough to clear tethers
      let farFromAll = true;
      const clearThreshold = isMobile ? 150 : 225;
      for (const n of nodes) {
        if (n.type === "participant") {
          const dx = clampedX - (n.x || 0);
          const dy = clampedY - (n.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < clearThreshold) {
            farFromAll = false;
          }
        }
      }

      const hasTethers = tethers.some(t => t.itemId === dragLineSource.id && t.participantIds.length > 0);
      setIsAboutToClear(farFromAll && hasTethers && !closestParticipant);
    }
  };

  // Double click tether line to delete it
  const handleTetherDoubleClick = (itemId: string, participantId: string) => {
    toggleTether(itemId, participantId);
  };

  // Double click item orb to clear its tethers
  const handleItemDoubleClick = (itemId: string) => {
    clearTethers(itemId);
  };

  return (
    <div ref={containerRef} className="canvas-container">

      {/* Glassmorphic Reset Canvas Button */}
      {!isReadOnly && clearAll && (
        <button
          type="button"
          onClick={clearAll}
          className="canvas-reset-btn"
          title="Reset Kanvas"
        >
          <Trash2 className="size-3.5" />
          <span className="reset-btn-text">Reset Kanvas</span>
        </button>
      )}

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleSvgTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        onTouchCancel={handleMouseUp}
        className="canvas-svg"
        role="application"
        aria-label="Kanvas Urunan interaktif"
        style={{ cursor: isPanning ? 'grabbing' : dragLineSource || draggedParticipantId ? 'default' : 'grab' }}
      >
        <defs>
          {/* Neon glow filters */}
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="avatar-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComponentTransfer in="blur" result="glow1">
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="glow1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

        </defs>

        {/* Outer zoom & pan container */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 1. Draw glowing elastic lines (Tethers) */}
          {links.map((link) => {
            const sourceNode = link.source as SimNode;
            const targetNode = link.target as SimNode;
            if (!sourceNode || !targetNode) return null;

            const x1 = sourceNode.x || 0;
            const y1 = sourceNode.y || 0;
            const x2 = targetNode.x || 0;
            const y2 = targetNode.y || 0;

            // Check if this tether is attached to the currently dragged item and about to be cleared
            const isTetherBeingCleared = dragLineSource &&
              dragLineSource.type === "item" &&
              sourceNode.id === dragLineSource.id &&
              isAboutToClear;

            // Draw the tether line
            return (
              <g key={link.id} className="group">
                {/* Thick interactive hit box for easier double clicking */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={20}
                  className="canvas-tether-hitbox"
                  onDoubleClick={() => handleTetherDoubleClick(sourceNode.id, targetNode.id)}
                />
                {/* Visible glowing tether */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isTetherBeingCleared ? "#ef4444" : link.color}
                  strokeWidth={isTetherBeingCleared ? 1.5 : 3}
                  strokeDasharray={isTetherBeingCleared ? "2 6" : "4 4"}
                  className="canvas-tether-visible"
                  style={{
                    filter: isTetherBeingCleared ? `drop-shadow(0 0 2px #ef4444)` : `drop-shadow(0 0 4px ${link.color})`,
                    opacity: isTetherBeingCleared ? 0.45 : 1,
                    transition: "stroke 0.2s, filter 0.2s, opacity 0.2s"
                  }}
                />
              </g>
            );
          })}

          {/* 2. Draw active dragging preview line */}
          {dragLineSource && dragLineSource.type === "item" && mousePos && (
            <line
              x1={dragLineSource.x}
              y1={dragLineSource.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke={hoveredParticipantId ? "#10b981" : isAboutToClear ? "#ef4444" : "#ffffff"}
              strokeWidth={3}
              strokeDasharray="5 5"
              className="canvas-drag-preview"
              style={{ filter: "drop-shadow(0 0 8px currentColor)" }}
            />
          )}

          {nodes.map((node) => {
            const x = node.x || 0;
            const y = node.y || 0;
            const isDragging = dragLineSource?.id === node.id || draggedParticipantId === node.id;

            if (node.type === "participant") {
              const isHoveredTarget = hoveredParticipantId === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${x}, ${y})`}
                  onMouseDown={(e) => handleMouseDown(e, node)}
                  onTouchStart={(e) => handleTouchStart(e, node)}
                  className="canvas-node-group group"
                >
                  {/* Glowing snaps aura */}
                  <circle
                    r={node.radius + (isMobile ? 8 : 12)}
                    fill="transparent"
                    stroke={isHoveredTarget ? node.color : "transparent"}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    className="canvas-snap-aura animate-spin"
                  />

                  {/* Avatar outer border ring */}
                  <circle
                    r={node.radius}
                    fill="rgba(15, 18, 36, 0.8)"
                    stroke={isHoveredTarget || isDragging ? "#ffffff" : node.color}
                    strokeWidth={isHoveredTarget ? 4 : 2.5}
                    style={{
                      filter: `drop-shadow(0 0 ${isHoveredTarget ? "12px" : "6px"} ${node.color})`,
                      transition: "stroke 0.2s, filter 0.2s, opacity 0.2s"
                    }}
                  />

                  {/* Glassy core */}
                  <circle r={node.radius - 2} fill="rgba(255, 255, 255, 0.03)" />

                  {/* Emoji Avatar */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={isMobile ? "24" : "32"}
                    y={isMobile ? "-4" : "-5"}
                    className="pointer-events-none select-none"
                  >
                    {node.emoji}
                  </text>

                  {/* Participant name */}
                  <text
                    textAnchor="middle"
                    y={node.radius - (isMobile ? 26 : 38)}
                    fill="#ffffff"
                    fontSize={isMobile ? "9.5" : "12"}
                    fontWeight="700"
                    fontFamily="var(--font-display)"
                    className="pointer-events-none select-none"
                  >
                    {node.name}
                  </text>
                </g>
              );
            } else {
              // Receipt Item Node ("Orb")
              const isTethered = (node.tetheredCount || 0) > 0;
              const glowColor = isTethered ? "var(--neon-pink)" : "var(--neon-blue)";

              return (
                <g
                  key={node.id}
                  transform={`translate(${x}, ${y})`}
                  onMouseDown={(e) => handleMouseDown(e, node)}
                  onTouchStart={(e) => handleTouchStart(e, node)}
                  onDoubleClick={() => handleItemDoubleClick(node.id)}
                  className="canvas-node-group group"
                >
                  {/* Outer pulsing glow circle */}
                  <circle
                    r={node.radius}
                    fill={isTethered ? "rgba(139, 92, 246, 0.15)" : "rgba(6, 182, 212, 0.1)"}
                    stroke={isTethered ? "var(--neon-purple)" : "var(--neon-blue)"}
                    strokeWidth={2}
                    style={{
                      filter: `drop-shadow(0 0 8px ${glowColor})`,
                      transition: "stroke 0.25s, fill 0.25s"
                    }}
                    className="group-hover:scale-105 transition-transform duration-200"
                  />

                  <circle r={node.radius - 2} fill="rgba(10, 11, 20, 0.85)" />

                  {/* Price Display */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    y={isMobile ? "-5" : "-8"}
                    fill="#ffffff"
                    fontSize={isMobile ? "9.5" : "11.5"}
                    fontWeight="800"
                    fontFamily="var(--font-display)"
                    className="pointer-events-none select-none"
                  >
                    {formatRupiah(node.price || 0)}
                  </text>

                  {/* Cut name text to fit inside the node */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    y={isMobile ? "9" : "12"}
                    fill="var(--muted-text)"
                    fontSize={isMobile ? "8" : "9.5"}
                    fontWeight="600"
                    fontFamily="var(--font-body)"
                    className="pointer-events-none select-none group-hover:fill-white transition-colors"
                  >
                    {node.name.length > (isMobile ? 8 : 10) ? `${node.name.substring(0, isMobile ? 7 : 9)}...` : node.name}
                  </text>

                  {/* Subtitle helper: split details */}
                  {isTethered && (
                    <g transform={`translate(0, ${node.radius + (isMobile ? 12 : 15)})`} className="canvas-split-tooltip opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <rect
                        x={isMobile ? "-45" : "-60"}
                        y={isMobile ? "-8" : "-10"}
                        width={isMobile ? "90" : "120"}
                        height={isMobile ? "16" : "20"}
                        rx="6"
                        fill="rgba(10, 11, 20, 0.95)"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize={isMobile ? "8" : "9"}
                        fontWeight="600"
                      >
                        Bagi {node.tetheredCount} org
                      </text>
                    </g>
                  )}
                </g>
              );
            }
          })}
        </g>
      </svg>

      {/* Zoom controls floating panel */}
      <div className="canvas-zoom-controls">
        <button
          type="button"
          onClick={zoomIn}
          className="zoom-btn"
          title="Perbesar"
        >
          <Plus className="size-3.5" />
        </button>
        <span className="zoom-level-text">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={zoomOut}
          className="zoom-btn"
          title="Perkecil"
        >
          <Minus className="size-3.5" />
        </button>
        <div className="zoom-divider" />
        <button
          type="button"
          onClick={resetZoom}
          className="zoom-btn"
          title="Reset Tampilan"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>

      {/* Manual Drag & Drop Guide / Help Banner */}
      {(showGuide || isAboutToClear) && (
        <div
          className={`canvas-guide-banner relative ${isAboutToClear ? "clearing" : ""}`}
        >
          {isAboutToClear ? (
            <>
              <Trash2 className="banner-icon-trash" />
              <span className="text-red-400 font-bold">Lepas klik buat mutusin semua koneksi!</span>
            </>
          ) : (
            <>
              <Info className="banner-icon-info" />
              <span>
                Tarik garis dari Orb Item ke Avatar buat sambungin. Tekan dua kali atau tarik ke ruang kosong buat mutus.
              </span>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="canvas-guide-close"
                aria-label="Tutup panduan"
              >
                <X />
              </button>
            </>
          )}
        </div>
      )}

      {/* Read-Only Status Indicator */}
      {isReadOnly && (
        <div className="canvas-readonly-indicator">
          <span className="size-2 rounded-full bg-red-500 animate-ping" />
          <span>MODE BACA-DOANG</span>
        </div>
      )}

      {/* Floating active orb status details */}
      {activeItemDetails && (
        <div className="canvas-active-orb-details animate-fade-in">
          <span className="font-bold text-white text-xs sm:text-sm">{activeItemDetails.name}</span>
          <span className="text-cyan-400 font-extrabold text-xs sm:text-sm">{formatRupiah(activeItemDetails.price * activeItemDetails.quantity)}</span>
          <span className="text-gray-400 text-[10px] sm:text-xs">(Jml: {activeItemDetails.quantity})</span>
        </div>
      )}
    </div>
  );
}
