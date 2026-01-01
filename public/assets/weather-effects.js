// ===== WEATHER EFFECTS SYSTEM =====
// This file handles all weather particle animations for Monomyth VTT

window.toggleWeatherMenu = function(event) {
    const menu = document.getElementById('weatherMenu');
    
    if (menu.style.display === 'block') {
        menu.style.display = 'none';
        return;
    }
    
    menu.innerHTML = '';
    
    // Header
    const header = document.createElement('div');
    header.className = 'weather-menu-item header';
    header.textContent = 'Weather Effects';
    menu.appendChild(header);

    // Weather options
    const weatherOptions = [
        { name: 'None', value: null, emoji: '⭕' },
        { name: 'Rain', value: 'rain', emoji: '🌧️' },
        { name: 'Snow', value: 'snow', emoji: '❄️' },
        { name: 'Leaves', value: 'leaves', emoji: '🍂' },
        { name: 'Embers', value: 'embers', emoji: '🔥' },
        { name: 'Aurora', value: 'aurora', emoji: '🌌' },
        { name: 'Fireflies', value: 'fireflies', emoji: '✨' },
        { name: 'Blossoms', value: 'blossoms', emoji: '🌸' },
        { name: 'Ash', value: 'ash', emoji: '💨' },
        { name: 'Fog', value: 'fog', emoji: '🌫️' },
        { name: 'Sand', value: 'sand', emoji: '🏜️' }
    ];

    weatherOptions.forEach(option => {
        const item = document.createElement('div');
        item.className = 'weather-menu-item';
        if (window.currentWeatherEffect === option.value) {
            item.classList.add('active');
        }
        
        item.textContent = `${option.emoji} ${option.name}`;
        
        item.onclick = () => {
            window.setWeatherEffect(option.value);
            menu.style.display = 'none';
        };

        menu.appendChild(item);
    });

    // Position menu
    menu.style.display = 'block';
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';
}

window.setWeatherEffect = function(effect) {
    window.currentWeatherEffect = effect;
    if (effect) {
        window.startWeatherEffect(effect);
    } else {
        window.stopWeatherEffect();
    }
}

window.startWeatherEffect = function(effect) {
    window.stopWeatherEffect();
    
    const canvas = document.getElementById('weatherCanvas');
    const ctx = canvas.getContext('2d');
    const particles = [];
    const sandParticles = [];
    
    const particleCount = 
        effect === 'fog' || effect === 'sand' ? 12 : 
        effect === 'embers' ? 120 :
        effect === 'aurora' ? 8 : 
        effect === 'fireflies' ? 30 : 
        effect === 'leaves' ? 100 :
        effect === 'blossoms' ? 80 :
        effect === 'ash' ? 120 :
        150;
    const sandParticleCount = 100;

    const resizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);
    };

    resizeCanvas();

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
        if (effect === 'fog') {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                radius: 150 + Math.random() * 250,
                scaleX: 1.2 + Math.random() * 0.8,
                scaleY: 0.6 + Math.random() * 0.4,
                rotation: Math.random() * Math.PI * 2,
                speedX: 0.1 + Math.random() * 0.3,
                speedY: 0.05 + Math.random() * 0.15,
                opacity: 0.0625 + Math.random() * 0.125
            });
        } else if (effect === 'sand') {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                radius: 150 + Math.random() * 250,
                scaleX: 1.2 + Math.random() * 0.8,
                scaleY: 0.6 + Math.random() * 0.4,
                rotation: Math.random() * Math.PI * 2,
                speedX: 0.5 + Math.random() * 1.5,
                speedY: 0.2 + Math.random() * 0.6,
                opacity: 0.08 + Math.random() * 0.12
            });
        } else if (effect === 'aurora') {
            particles.push({
                y: Math.random() * window.innerHeight * 0.5,
                offset: Math.random() * Math.PI * 2,
                speed: 0.002 + Math.random() * 0.003,
                amplitude: 30 + Math.random() * 50,
                wavelength: 0.003 + Math.random() * 0.002,
                height: 40 + Math.random() * 60,
                hue: 120 + Math.random() * 60,
                opacity: 0.3 + Math.random() * 0.4
            });
        } else if (effect === 'fireflies') {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                size: 2 + Math.random() * 2,
                pulseOffset: Math.random() * Math.PI * 2,
                pulseSpeed: 0.02 + Math.random() * 0.03,
                baseOpacity: 0.5 + Math.random() * 0.3
            });
        } else if (effect === 'leaves') {
            const colors = [
                { r: 218, g: 112, b: 47 },
                { r: 139, g: 69, b: 19 },
                { r: 255, g: 140, b: 0 },
                { r: 205, g: 92, b: 92 },
                { r: 184, g: 134, b: 11 }
            ];
            const color = colors[Math.floor(Math.random() * colors.length)];
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                speed: 0.5 + Math.random() * 1,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.1,
                drift: (Math.random() - 0.5) * 1.5,
                size: 4 + Math.random() * 4,
                color: color,
                opacity: 0.6 + Math.random() * 0.4,
                sway: Math.random() * Math.PI * 2,
                swaySpeed: 0.02 + Math.random() * 0.03
            });
        } else if (effect === 'blossoms') {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                speed: 0.3 + Math.random() * 0.7,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.08,
                drift: (Math.random() - 0.5) * 1,
                size: 3 + Math.random() * 3,
                opacity: 0.5 + Math.random() * 0.4,
                sway: Math.random() * Math.PI * 2,
                swaySpeed: 0.02 + Math.random() * 0.02
            });
        } else if (effect === 'ash') {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                speed: 0.2 + Math.random() * 0.6,
                drift: (Math.random() - 0.5) * 0.8,
                size: 1 + Math.random() * 2,
                opacity: 0.3 + Math.random() * 0.5,
                grayValue: 50 + Math.random() * 100
            });
        } else {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                speed: effect === 'rain' ? 3 + Math.random() * 5 : effect === 'snow' ? 1 + Math.random() * 2 : -0.5 - Math.random() * 1,
                size: effect === 'rain' ? 1 + Math.random() * 2 : effect === 'snow' ? 3 + Math.random() * 3 : 2 + Math.random() * 3,
                opacity: 0.3 + Math.random() * 0.7,
                drift: effect === 'snow' ? (Math.random() - 0.5) * 0.5 : 0
            });
        }
    }
    
    if (effect === 'sand') {
        for (let i = 0; i < sandParticleCount; i++) {
            sandParticles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                speedX: 2 + Math.random() * 4,
                speedY: 0.5 + Math.random() * 1.5,
                size: 1 + Math.random() * 2,
                opacity: 0.3 + Math.random() * 0.5
            });
        }
    }

    const animate = () => {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        particles.forEach(particle => {
            if (effect === 'fog') {
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation);
                ctx.scale(particle.scaleX, particle.scaleY);
                
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.radius);
                gradient.addColorStop(0, `rgba(200, 200, 220, ${particle.opacity})`);
                gradient.addColorStop(0.5, `rgba(180, 180, 200, ${particle.opacity * 0.5})`);
                gradient.addColorStop(1, 'rgba(160, 160, 180, 0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(-particle.radius, -particle.radius, particle.radius * 2, particle.radius * 2);
                ctx.restore();
                
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                
                if (particle.x > window.innerWidth + particle.radius) particle.x = -particle.radius;
                if (particle.x < -particle.radius) particle.x = window.innerWidth + particle.radius;
                if (particle.y > window.innerHeight + particle.radius) particle.y = -particle.radius;
                if (particle.y < -particle.radius) particle.y = window.innerHeight + particle.radius;
                
            } else if (effect === 'sand') {
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation);
                ctx.scale(particle.scaleX, particle.scaleY);
                
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.radius);
                gradient.addColorStop(0, `rgba(210, 180, 140, ${particle.opacity})`);
                gradient.addColorStop(0.5, `rgba(194, 178, 128, ${particle.opacity * 0.5})`);
                gradient.addColorStop(1, 'rgba(189, 183, 107, 0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(-particle.radius, -particle.radius, particle.radius * 2, particle.radius * 2);
                ctx.restore();
                
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                
                if (particle.x > window.innerWidth + particle.radius) particle.x = -particle.radius;
                if (particle.x < -particle.radius) particle.x = window.innerWidth + particle.radius;
                if (particle.y > window.innerHeight + particle.radius) particle.y = -particle.radius;
                if (particle.y < -particle.radius) particle.y = window.innerHeight + particle.radius;
                
            } else if (effect === 'aurora') {
                particle.offset += particle.speed;
                
                const gradient = ctx.createLinearGradient(0, particle.y, 0, particle.y + particle.height);
                const hue = (particle.hue + Math.sin(particle.offset) * 30) % 360;
                gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0)`);
                gradient.addColorStop(0.5, `hsla(${hue}, 70%, 60%, ${particle.opacity})`);
                gradient.addColorStop(1, `hsla(${hue}, 70%, 60%, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                for (let x = 0; x < window.innerWidth; x += 5) {
                    const waveY = particle.y + Math.sin(x * particle.wavelength + particle.offset) * particle.amplitude;
                    if (x === 0) {
                        ctx.moveTo(x, waveY);
                    } else {
                        ctx.lineTo(x, waveY);
                    }
                }
                ctx.lineTo(window.innerWidth, particle.y + particle.height);
                ctx.lineTo(0, particle.y + particle.height);
                ctx.closePath();
                ctx.fill();
                
            } else if (effect === 'fireflies') {
                particle.pulseOffset += particle.pulseSpeed;
                const pulse = (Math.sin(particle.pulseOffset) + 1) / 2;
                const currentOpacity = particle.baseOpacity * (0.3 + pulse * 0.7);
                
                const gradient = ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size * 2
                );
                gradient.addColorStop(0, `rgba(255, 255, 150, ${currentOpacity})`);
                gradient.addColorStop(0.5, `rgba(200, 255, 150, ${currentOpacity * 0.6})`);
                gradient.addColorStop(1, `rgba(100, 200, 100, 0)`);
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
                ctx.fill();
                
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                
                if (particle.x > window.innerWidth) particle.x = 0;
                if (particle.x < 0) particle.x = window.innerWidth;
                if (particle.y > window.innerHeight) particle.y = 0;
                if (particle.y < 0) particle.y = window.innerHeight;
                
            } else if (effect === 'leaves') {
                ctx.save();
                particle.sway += particle.swaySpeed;
                const swayX = Math.sin(particle.sway) * 20;
                
                ctx.translate(particle.x + swayX, particle.y);
                ctx.rotate(particle.rotation);
                
                ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.opacity})`;
                ctx.beginPath();
                ctx.ellipse(0, 0, particle.size, particle.size * 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = `rgba(${Math.max(0, particle.color.r - 30)}, ${Math.max(0, particle.color.g - 30)}, ${Math.max(0, particle.color.b - 30)}, ${particle.opacity * 0.5})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(0, -particle.size * 1.5);
                ctx.lineTo(0, particle.size * 1.5);
                ctx.stroke();
                
                ctx.restore();
                
                particle.y += particle.speed;
                particle.x += particle.drift * 0.1;
                particle.rotation += particle.rotationSpeed;
                
                if (particle.y > window.innerHeight) particle.y = -10;
                if (particle.x > window.innerWidth) particle.x = 0;
                if (particle.x < 0) particle.x = window.innerWidth;
                
            } else if (effect === 'blossoms') {
                ctx.save();
                particle.sway += particle.swaySpeed;
                const swayX = Math.sin(particle.sway) * 15;
                
                ctx.translate(particle.x + swayX, particle.y);
                ctx.rotate(particle.rotation);
                
                ctx.fillStyle = `rgba(255, 182, 193, ${particle.opacity})`;
                for (let i = 0; i < 5; i++) {
                    ctx.save();
                    ctx.rotate((Math.PI * 2 * i) / 5);
                    ctx.beginPath();
                    ctx.ellipse(0, particle.size * 0.6, particle.size * 0.5, particle.size * 0.8, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                
                ctx.fillStyle = `rgba(255, 240, 200, ${particle.opacity})`;
                ctx.beginPath();
                ctx.arc(0, 0, particle.size * 0.3, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
                
                particle.y += particle.speed;
                particle.x += particle.drift * 0.1;
                particle.rotation += particle.rotationSpeed;
                
                if (particle.y > window.innerHeight) particle.y = -10;
                if (particle.x > window.innerWidth) particle.x = 0;
                if (particle.x < 0) particle.x = window.innerWidth;
                
            } else if (effect === 'ash') {
                ctx.fillStyle = `rgba(${particle.grayValue}, ${particle.grayValue}, ${particle.grayValue}, ${particle.opacity})`;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                
                particle.y += particle.speed;
                particle.x += particle.drift;
                
                if (particle.y > window.innerHeight) particle.y = 0;
                if (particle.x > window.innerWidth) particle.x = 0;
                if (particle.x < 0) particle.x = window.innerWidth;
                
            } else if (effect === 'rain') {
                ctx.fillStyle = `rgba(174, 194, 224, ${particle.opacity})`;
                ctx.fillRect(particle.x, particle.y, particle.size, 10);
            } else if (effect === 'snow') {
                ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (effect === 'embers') {
                const gradient = ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.size
                );
                gradient.addColorStop(0, `rgba(255, 220, 100, ${particle.opacity})`);
                gradient.addColorStop(0.5, `rgba(255, 140, 50, ${particle.opacity * 0.8})`);
                gradient.addColorStop(1, `rgba(200, 50, 20, 0)`);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            }

            if (effect !== 'fog' && effect !== 'sand' && effect !== 'aurora' && effect !== 'fireflies' && effect !== 'leaves' && effect !== 'blossoms' && effect !== 'ash') {
                particle.y += particle.speed;
                particle.x += particle.drift;

                if (effect === 'embers') {
                    if (particle.y < 0) particle.y = window.innerHeight;
                } else {
                    if (particle.y > window.innerHeight) particle.y = 0;
                }
                if (particle.x > window.innerWidth) particle.x = 0;
                if (particle.x < 0) particle.x = window.innerWidth;
            }
        });
        
        if (effect === 'sand') {
            sandParticles.forEach(sp => {
                ctx.fillStyle = `rgba(210, 180, 140, ${sp.opacity})`;
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
                ctx.fill();
                
                sp.x += sp.speedX;
                sp.y += sp.speedY;
                
                if (sp.x > window.innerWidth) sp.x = 0;
                if (sp.y > window.innerHeight) sp.y = 0;
            });
        }

        window.weatherAnimationId = requestAnimationFrame(animate);
    };

    animate();
    window.addEventListener('resize', resizeCanvas);
}

window.stopWeatherEffect = function() {
    if (window.weatherAnimationId) {
        cancelAnimationFrame(window.weatherAnimationId);
        window.weatherAnimationId = null;
    }
    const canvas = document.getElementById('weatherCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}
