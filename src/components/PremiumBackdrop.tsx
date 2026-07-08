import React, { useEffect, useRef } from "react";
import { calculateStudentLevel } from "../types";

interface PremiumBackdropProps {
  themePreset: string;
  userXp: number;
}

export default function PremiumBackdrop({ themePreset, userXp }: PremiumBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const { level } = calculateStudentLevel(userXp);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];
    const maxParticles = 40;

    // Track window dimensions
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      canvas.width = parent ? parent.clientWidth : window.innerWidth;
      canvas.height = parent ? parent.clientHeight : window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Track mouse hover positions
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Force cherry blossom theme if level is high enough, or if active cosmic/cyberpunk preset is chosen
    const isBlossomLevel = level >= 28;
    const isSpecialTheme = themePreset === "cosmic" || themePreset === "cyberpunk";
    const activeEffectType = (isBlossomLevel || isSpecialTheme) 
      ? "blossom" 
      : themePreset; // "forest" | "crimson" | "honey" | "nordic" | "amoled" ...

    // Particle template definition
    class ThemeParticle {
      x: number = 0;
      y: number = 0;
      vx: number = 0;
      vy: number = 0;
      size: number = 0;
      rotation: number = 0;
      rotationSpeed: number = 0;
      opacity: number = 0;
      color: string = "";
      type: string = "";

      constructor() {
        this.reset(true);
      }

      reset(initAtRandomY = false) {
        this.type = activeEffectType;
        this.x = Math.random() * canvas.width;
        this.y = initAtRandomY ? Math.random() * canvas.height : -20;
        this.size = Math.random() * 8 + 4;
        this.opacity = Math.random() * 0.4 + 0.2;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;

        // Custom physics by theme type
        if (this.type === "blossom") {
          // Gently floating down and left/right
          this.vx = Math.random() * 1 - 0.2;
          this.vy = Math.random() * 1.2 + 0.8;
          // Soft pink tones for sakura blossoms
          const pinks = ["#fbcfe8", "#f472b6", "#fda4af", "#fecdd3"];
          this.color = pinks[Math.floor(Math.random() * pinks.length)];
        } else if (this.type === "forest") {
          // Floating leaves
          this.vx = Math.random() * 0.6 - 0.3;
          this.vy = Math.random() * 0.8 + 0.6;
          // Rich forest green hues
          const greens = ["#6ee7b7", "#34d399", "#a7f3d0", "#059669"];
          this.color = greens[Math.floor(Math.random() * greens.length)];
        } else if (this.type === "crimson") {
          // Falling autumn leaves
          this.vx = Math.random() * 0.8 - 0.4;
          this.vy = Math.random() * 1.0 + 0.7;
          // Deep crimson / orange tones
          const autumns = ["#f87171", "#f97316", "#ef4444", "#dc2626"];
          this.color = autumns[Math.floor(Math.random() * autumns.length)];
        } else if (this.type === "honey") {
          // Amber rising bubbles (negative gravity)
          this.vx = Math.random() * 0.4 - 0.2;
          this.vy = -(Math.random() * 0.7 + 0.4);
          this.y = initAtRandomY ? Math.random() * canvas.height : canvas.height + 20;
          // Amber glows
          const ambers = ["#fbbf24", "#f59e0b", "#d97706", "#fef3c7"];
          this.color = ambers[Math.floor(Math.random() * ambers.length)];
        } else if (this.type === "nordic") {
          // Snowflake particles falling straight down
          this.vx = Math.random() * 0.4 - 0.2;
          this.vy = Math.random() * 1.5 + 0.5;
          this.size = Math.random() * 4 + 2;
          this.color = "#ffffff";
        } else {
          // Default soft warm dust specks
          this.vx = Math.random() * 0.2 - 0.1;
          this.vy = Math.random() * 0.4 + 0.2;
          this.size = Math.random() * 4 + 2;
          this.color = themePreset === "amoled" ? "#38bdf8" : "#94a3b8";
        }
      }

      update() {
        // Move particle
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;

        // Interactive mouse repulsion physics
        const dx = this.x - mouseRef.current.x;
        const dy = this.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          const force = (100 - dist) / 100; // Force multiplier
          const angle = Math.atan2(dy, dx);
          this.x += Math.cos(angle) * force * 3;
          this.y += Math.sin(angle) * force * 3;
        }

        // Reset if out of bounds
        if (this.type === "honey") {
          if (this.y < -20 || this.x < -20 || this.x > canvas.width + 20) {
            this.reset(false);
          }
        } else {
          if (this.y > canvas.height + 20 || this.x < -20 || this.x > canvas.width + 20) {
            this.reset(false);
          }
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.save();
        c.translate(this.x, this.y);
        c.rotate(this.rotation);
        c.globalAlpha = this.opacity;
        c.fillStyle = this.color;
        c.shadowColor = this.color;
        c.shadowBlur = this.type === "honey" || this.type === "blossom" ? 8 : 0;

        if (this.type === "blossom") {
          // Draw sakura petal shape
          c.beginPath();
          c.moveTo(0, 0);
          c.bezierCurveTo(-this.size, -this.size * 1.5, -this.size * 1.5, this.size / 2, 0, this.size);
          c.bezierCurveTo(this.size * 1.5, this.size / 2, this.size, -this.size * 1.5, 0, 0);
          c.fill();
        } else if (this.type === "forest" || this.type === "crimson") {
          // Draw standard leaves shape
          c.beginPath();
          c.moveTo(0, -this.size);
          c.quadraticCurveTo(-this.size / 2, 0, 0, this.size);
          c.quadraticCurveTo(this.size / 2, 0, 0, -this.size);
          c.fill();
        } else if (this.type === "honey") {
          // Draw circle bubble
          c.beginPath();
          c.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          c.fill();
        } else if (this.type === "nordic") {
          // Snowflake dot
          c.beginPath();
          c.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          c.fill();
        } else {
          // Soft dust particle
          c.beginPath();
          c.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          c.fill();
        }

        c.restore();
      }
    }

    // Initialize particles list
    for (let i = 0; i < maxParticles; i++) {
      particles.push(new ThemeParticle());
    }

    // Canvas render tick loop
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.update();
        p.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(tick);
    };
    tick();

    // Cleanup loop listeners
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [themePreset, level]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 mix-blend-screen opacity-70"
      style={{ display: "block" }}
    />
  );
}
