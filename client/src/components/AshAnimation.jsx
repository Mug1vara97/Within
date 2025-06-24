import React, { useEffect, useRef } from 'react';

const AshAnimation = () => {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const createParticle = () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speedX: Math.random() * 2 - 1,
            speedY: Math.random() * 1 + 0.5,
            opacity: Math.random() * 0.5 + 0.1
        });

        const initParticles = () => {
            particlesRef.current = Array(50).fill().map(createParticle);
        };

        const drawParticle = (particle) => {
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        };

        const updateParticle = (particle) => {
            particle.x += particle.speedX;
            particle.y += particle.speedY;

            if (particle.y > canvas.height) {
                particle.y = -10;
                particle.x = Math.random() * canvas.width;
            }
            if (particle.x > canvas.width) {
                particle.x = 0;
            }
            if (particle.x < 0) {
                particle.x = canvas.width;
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particlesRef.current.forEach(particle => {
                updateParticle(particle);
                drawParticle(particle);
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        resizeCanvas();
        initParticles();
        animate();

        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0
            }}
        />
    );
};

export default AshAnimation; 