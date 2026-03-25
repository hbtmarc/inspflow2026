/* ============================================
   DDSMS | SAFETY PRESENTATION JAVASCRIPT
   Sistema Modular de Controle de Apresentação
   ============================================ */

/* ============================================
   CLASSE: LOADING MANAGER
   ============================================ */
class LoadingManager {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
    }

    hide() {
        setTimeout(() => {
            if (this.loadingScreen) {
                this.loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    this.loadingScreen.remove();
                }, 600);
            }
        }, 1000);
    }
}

/* ============================================
   CLASSE: PARTICLES CANVAS
   ============================================ */
class ParticlesCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 35; // Reduced count for cleaner look
        // Petrobras Colors: Green, Yellow, Light Green, Red (Safety)
        this.colors = ['#008542', '#FFCC29', '#00a552', '#ef4444'];
        
        this.resize();
        this.init();
        this.animate();
        
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    init() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 3 + 1,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach((particle, i) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;
            
            // Desenhar partícula
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
            
            // Conectar partículas próximas
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[j].x - particle.x;
                const dy = this.particles[j].y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) { // Reduced connection distance
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.strokeStyle = particle.color;
                    this.ctx.globalAlpha = (1 - distance / 100) * 0.2; // Reduced line opacity
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                    this.ctx.globalAlpha = 1;
                }
            }
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

/* ============================================
   CLASSE: SLIDE MANAGER
   ============================================ */
class SlideManager {
    constructor() {
        this.slides = document.querySelectorAll('.slide');
        this.currentSlide = 1;
        this.totalSlides = this.slides.length;
        
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.progressBar = document.getElementById('progressBar');
        this.slideIndicator = document.getElementById('slideIndicator');
        
        this.init();
    }

    init() {
        if (!this.totalSlides) {
            return;
        }

        this.syncCurrentSlideFromDOM();

        // Eventos de navegação
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.previousSlide());
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextSlide());
        }
        
        // Navegação por teclado
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Swipe em dispositivos móveis
        this.setupSwipeGestures();
        
        // Mostrar primeiro slide
        this.showSlide(this.currentSlide);
    }

    syncCurrentSlideFromDOM() {
        const activeFromMarkup = document.querySelector('.slide.active[id^="slide-"]');
        if (!activeFromMarkup) {
            return;
        }

        const numericId = Number(activeFromMarkup.id.replace('slide-', ''));
        if (Number.isInteger(numericId) && numericId >= 1 && numericId <= this.totalSlides) {
            this.currentSlide = numericId;
        }
    }

    showSlide(slideNumber) {
        // Remover classe active de todos e ocultar de forma determinística
        this.slides.forEach(slide => {
            slide.classList.remove('active');
            slide.hidden = true;
            slide.setAttribute('aria-hidden', 'true');
        });
        
        // Adicionar classe active ao slide atual
        const currentSlideElement = document.getElementById(`slide-${slideNumber}`);
        if (currentSlideElement) {
            currentSlideElement.classList.add('active');
            currentSlideElement.hidden = false;
            currentSlideElement.setAttribute('aria-hidden', 'false');
        }
        
        // Atualizar controles
        this.updateControls();
        
        // Resetar animações
        this.resetAnimations(slideNumber);
        
        // Atualizar indicador de slide
        if (this.slideIndicator) {
            this.slideIndicator.textContent = `${slideNumber} / ${this.totalSlides}`;
        }
    }

    resetAnimations(slideNumber) {
        const currentSlideElement = document.getElementById(`slide-${slideNumber}`);
        if (!currentSlideElement) return;
        
        const animatedItems = currentSlideElement.querySelectorAll('.animated-item');
        animatedItems.forEach(item => {
            item.style.opacity = '0';
            item.style.animation = 'none';
            void item.offsetWidth; // Trigger reflow
            item.style.animation = '';
        });

        // Fallback para ambientes onde animações podem não iniciar
        setTimeout(() => {
            animatedItems.forEach(item => {
                if (item.isConnected && getComputedStyle(item).opacity === '0') {
                    item.style.opacity = '1';
                }
            });
        }, 850);
    }

    updateControls() {
        // Botão anterior
        if (this.prevBtn) {
            this.prevBtn.disabled = this.currentSlide === 1;
        }
        
        // Botão próximo
        if (this.nextBtn) {
            if (this.currentSlide === this.totalSlides) {
                this.nextBtn.textContent = 'Reiniciar';
                this.nextBtn.classList.remove('primary');
                this.nextBtn.classList.add('secondary');
            } else {
                this.nextBtn.textContent = 'Próximo';
                this.nextBtn.classList.add('primary');
                this.nextBtn.classList.remove('secondary');
            }
        }
        
        // Barra de progresso
        if (this.progressBar) {
            const progressPercentage = (this.currentSlide / this.totalSlides) * 100;
            this.progressBar.style.width = `${progressPercentage}%`;
        }
    }

    nextSlide() {
        if (this.currentSlide < this.totalSlides) {
            this.currentSlide++;
            this.showSlide(this.currentSlide);
        } else {
            // Reiniciar apresentação
            this.currentSlide = 1;
            this.showSlide(this.currentSlide);
        }
    }

    previousSlide() {
        if (this.currentSlide > 1) {
            this.currentSlide--;
            this.showSlide(this.currentSlide);
        }
    }

    handleKeyboard(e) {
        switch(e.key) {
            case 'ArrowRight':
            case ' ':
            case 'PageDown':
                e.preventDefault();
                this.nextSlide();
                break;
            case 'ArrowLeft':
            case 'PageUp':
                e.preventDefault();
                this.previousSlide();
                break;
            case 'Home':
                e.preventDefault();
                this.currentSlide = 1;
                this.showSlide(this.currentSlide);
                break;
            case 'End':
                e.preventDefault();
                this.currentSlide = this.totalSlides;
                this.showSlide(this.currentSlide);
                break;
        }
    }

    setupSwipeGestures() {
        let touchStartX = 0;
        let touchEndX = 0;
        
        const presentationCard = document.getElementById('presentationCard');
        if (!presentationCard) {
            return;
        }
        
        presentationCard.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);
        
        presentationCard.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, false);
        
        const handleSwipe = () => {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swipe left - próximo slide
                    this.nextSlide();
                } else {
                    // Swipe right - slide anterior
                    this.previousSlide();
                }
            }
        };
        
        this.handleSwipe = handleSwipe;
    }

    goToSlide(slideNumber) {
        if (slideNumber >= 1 && slideNumber <= this.totalSlides) {
            this.currentSlide = slideNumber;
            this.showSlide(this.currentSlide);
        }
    }
}

/* ============================================
   CLASSE: TIMER CONTROLLER
   ============================================ */
class TimerController {
    constructor() {
        this.timerElement = document.getElementById('timer');
        this.seconds = 0;
        this.interval = null;
        
        this.init();
    }

    init() {
        if (!this.timerElement) {
            return;
        }
        this.start();
        
        // Reset ao clicar
        this.timerElement.addEventListener('click', () => this.reset());
    }

    start() {
        if (!this.timerElement) {
            return;
        }
        if (this.interval) clearInterval(this.interval);
        
        this.interval = setInterval(() => {
            this.seconds++;
            this.updateDisplay();
        }, 1000);
    }

    reset() {
        if (!this.timerElement) {
            return;
        }
        this.seconds = 0;
        this.updateDisplay();
        
        // Feedback visual
        this.timerElement.classList.add('clicked');
        setTimeout(() => {
            this.timerElement.classList.remove('clicked');
        }, 300);
        
        // Reiniciar timer
        clearInterval(this.interval);
        this.start();
    }

    updateDisplay() {
        if (!this.timerElement || !this.timerElement.isConnected) {
            this.pause();
            return;
        }
        try {
            const mins = Math.floor(this.seconds / 60).toString().padStart(2, '0');
            const secs = (this.seconds % 60).toString().padStart(2, '0');
            this.timerElement.textContent = `${mins}:${secs}`;
        } catch (error) {
            this.pause();
        }
    }

    pause() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    resume() {
        if (!this.interval) {
            this.start();
        }
    }

    getTime() {
        return this.seconds;
    }
}

/* ============================================
   CLASSE: FULLSCREEN MANAGER
   ============================================ */
class FullscreenManager {
    constructor() {
        this.presentationCard = document.getElementById('presentationCard');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.enterIcon = document.getElementById('fs-enter-icon');
        this.exitIcon = document.getElementById('fs-exit-icon');
        
        this.init();
    }

    init() {
        if (!this.fullscreenBtn || !this.presentationCard) {
            return;
        }

        this.fullscreenBtn.addEventListener('click', () => this.toggle());
        
        document.addEventListener('fullscreenchange', () => this.updateUI());
        document.addEventListener('webkitfullscreenchange', () => this.updateUI());
        document.addEventListener('mozfullscreenchange', () => this.updateUI());
        document.addEventListener('MSFullscreenChange', () => this.updateUI());
        
        // Tecla F11 ou F para fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        if (!this.isFullscreen()) {
            this.enter();
        } else {
            this.exit();
        }
    }

    enter() {
        const element = this.presentationCard;
        if (!element) {
            return;
        }
        
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }

    exit() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    isFullscreen() {
        return !!(document.fullscreenElement || 
                 document.webkitFullscreenElement || 
                 document.mozFullScreenElement || 
                 document.msFullscreenElement);
    }

    updateUI() {
        const isFullscreen = this.isFullscreen();
        
        // Atualizar ícones
        if (this.enterIcon && this.exitIcon) {
            this.enterIcon.classList.toggle('hidden', isFullscreen);
            this.exitIcon.classList.toggle('hidden', !isFullscreen);
        }
        
        // Atualizar classe do card
        if (this.presentationCard) {
            this.presentationCard.classList.toggle('fullscreen', isFullscreen);
        }
    }
}

/* ============================================
   CLASSE: KEYBOARD SHORTCUTS MANAGER
   ============================================ */
class KeyboardShortcutsManager {
    constructor(slideManager, timerController, fullscreenManager) {
        this.slideManager = slideManager;
        this.timerController = timerController;
        this.fullscreenManager = fullscreenManager;
        
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            // Prevenir atalhos em campos de input (se houver)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Atalhos disponíveis já implementados em outras classes
            // Esta classe pode ser expandida para mostrar uma tela de ajuda
            
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                this.showHelpOverlay();
            }
        });
    }

    showHelpOverlay() {
        // Criar overlay de ajuda se não existir
        let overlay = document.getElementById('keyboard-help-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'keyboard-help-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-family: 'Inter', sans-serif;
            `;
            
            overlay.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.1); backdrop-filter: blur(20px); padding: 3rem; border-radius: 1.5rem; max-width: 600px; border: 2px solid rgba(16, 185, 129, 0.3);">
                    <h2 style="font-size: 2rem; font-weight: 700; margin-bottom: 1.5rem; text-align: center;">⌨️ Atalhos do Teclado</h2>
                    <div style="display: grid; gap: 1rem; font-size: 1.125rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span><kbd style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 0.375rem;">→</kbd> / <kbd style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 0.375rem;">Espaço</kbd></span>
                            <span>Próximo Slide</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span><kbd style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 0.375rem;">←</kbd></span>
                            <span>Slide Anterior</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span><kbd style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 0.375rem;">Home</kbd></span>
                            <span>Primeiro Slide</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span><kbd style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 0.375rem;">End</kbd></span>
                            <span>Último Slide</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span><kbd style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 0.375rem;">F</kbd></span>
                            <span>Tela Cheia</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span><kbd style="background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 0.375rem;">ESC</kbd></span>
                            <span>Fechar (Ajuda ou Fullscreen)</span>
                        </div>
                    </div>
                    <p style="margin-top: 2rem; text-align: center; opacity: 0.7;">Pressione ESC para fechar</p>
                </div>
            `;
            
            // Fechar ao clicar ou pressionar ESC
            overlay.addEventListener('click', () => overlay.remove());
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            });
            
            document.body.appendChild(overlay);
        }
    }
}

/* ============================================
   INICIALIZAÇÃO PRINCIPAL
   ============================================ */
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar Loading Screen
    const loadingManager = new LoadingManager();
    loadingManager.hide();

    // Inicializar Partículas
    new ParticlesCanvas('particles-canvas');

    // Inicializar Gerenciador de Slides
    const slideManager = new SlideManager();

    // Inicializar Timer
    const timerController = new TimerController();

    // Inicializar Fullscreen
    const fullscreenManager = new FullscreenManager();

    // Inicializar Atalhos de Teclado
    new KeyboardShortcutsManager(slideManager, timerController, fullscreenManager);

    // Console Easter Egg
    console.log('%c💺 ERGONOMIA NO TRABALHO DIGITAL', 'font-size: 20px; color: #10b981; font-weight: bold;');
    console.log('%cApresentação Premium | Pressione ? para ver os atalhos', 'font-size: 14px; color: #facc15;');
});
