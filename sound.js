(function (global) {
    'use strict';

    let ctx = null;
    let master = null;
    let noiseBuf = null;
    let voices = 0;
    let lastAt = 0;

    const MAX_VOICES = 6;
    const MIN_GAP = 0.03;
    const MASTER_VOLUME = 0.7;

    function getCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            master = ctx.createGain();
            master.gain.value = MASTER_VOLUME;
            master.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function canPlay(duration) {
        const c = getCtx();
        if (c.currentTime - lastAt < MIN_GAP) return false;
        if (voices >= MAX_VOICES) return false;
        lastAt = c.currentTime;
        voices++;
        setTimeout(function () { voices--; }, duration * 1000);
        return true;
    }

    function getNoiseBuffer(c) {
        if (noiseBuf) return noiseBuf;
        const len = Math.floor(c.sampleRate * 0.12);
        noiseBuf = c.createBuffer(1, len, c.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        }
        return noiseBuf;
    }

    function playCardSound() {
        if (!canPlay(0.12)) return;
        const c = getCtx();
        const now = c.currentTime;

        const source = c.createBufferSource();
        source.buffer = getNoiseBuffer(c);

        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 4000;
        filter.Q.value = 1.5;

        const gain = c.createGain();
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        source.start(now);
        source.stop(now + 0.12);
    }

    function playHitSound() {
        if (!canPlay(0.3)) return;
        const c = getCtx();
        const now = c.currentTime;

        [0, 0.18].forEach(function (delay) {
            const osc = c.createOscillator();
            const gain = c.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, now + delay);
            osc.frequency.exponentialRampToValueAtTime(100, now + delay + 0.08);

            gain.gain.setValueAtTime(0.2, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);

            osc.connect(gain);
            gain.connect(master);

            osc.start(now + delay);
            osc.stop(now + delay + 0.1);
        });
    }

    function playStandSound() {
        if (!canPlay(0.2)) return;
        const c = getCtx();
        const now = c.currentTime;

        const osc = c.createOscillator();
        const gain = c.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    function unlock() {
        getCtx();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
    }
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    global.playCardSound = playCardSound;
    global.playHitSound = playHitSound;
    global.playStandSound = playStandSound;
})(window);
