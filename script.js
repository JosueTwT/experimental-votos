const SB_URL = "https://ybbaysmlawnwamcbaent.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliYmF5c21sYXdud2FtY2JhZW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0ODM0NDMsImV4cCI6MjA4NjA1OTQ0M30.bgnkSZZB3_mMP_kA5Ut5uWuFlSLydWHCkJG0bl-sywg";
const _supabase = supabase.createClient(SB_URL, SB_KEY);

let usuarioID = localStorage.getItem('user_id');
if (!usuarioID) {
    usuarioID = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('user_id', usuarioID);
}


const LIMITE_VOTOS = 5; // <--- Cambiado de 3 a 5

function notificar(msg, tipo = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `<span>${tipo === 'success' ? '✅' : '⚠️'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function cargarCanciones() {
    const lista = document.getElementById('lista-canciones');
    lista.innerHTML = '<div style="text-align:center; padding:20px; color:#999">Cargando ranking...</div>';

    const { data: canciones, error } = await _supabase
        .from('canciones')
        .select('*')
        .eq('aprobada', true)
        .order('votos_conteo', { ascending: false });

    const { data: misVotos } = await _supabase
        .from('votos')
        .select('cancion_id')
        .eq('usuario_huella', usuarioID);

    if (error) return notificar("Error de conexión", "error");

    const misVotosIds = misVotos ? misVotos.map(v => v.cancion_id) : [];
    lista.innerHTML = "";

    if (canciones.length === 0) {
        lista.innerHTML = '<div style="text-align:center; padding:20px; color:#999">No hay canciones aún 😢</div>';
        return;
    }

    canciones.forEach((song, index) => {
        const yaVoto = misVotosIds.includes(song.id);
        const limiteAlcanzado = misVotosIds.length >= LIMITE_VOTOS; 
        const rankClass = index < 3 ? `top-${index + 1}` : '';

        const div = document.createElement('div');
        div.className = 'song-item';
        div.innerHTML = `
            <div class="rank ${rankClass}">#${index + 1}</div>
            <div class="song-info">${song.titulo}</div>
            <div class="vote-controls">
                <span class="vote-number">${song.votos_conteo || 0} pts</span>
                ${yaVoto 
                    ? `<button class="btn-unvote" onclick="quitarVoto('${song.id}')">Quitar</button>` 
                    : `<button class="btn-vote" onclick="votar('${song.id}')" ${limiteAlcanzado ? 'disabled' : ''}>
                        ${limiteAlcanzado ? 'Límite' : 'Votar'}
                       </button>`
                }
            </div>
        `;
        lista.appendChild(div);
    });
}

async function enviarCancion() {
    const input = document.getElementById('inputSong');
    const val = input.value.trim();
    if (!val) return notificar("Escribe el nombre de la canción", "error");

    const { error } = await _supabase.from('canciones').insert([{ titulo: val, aprobada: false, votos_conteo: 0 }]);
    if (error) notificar("Error al enviar", "error");
    else {
        notificar("¡Sugerencia enviada! Esperando aprobación.");
        input.value = "";
    }
}

async function votar(id) {
    const { error } = await _supabase.from('votos').insert([{ cancion_id: id, usuario_huella: usuarioID }]);
    
    
    if (error) return notificar(`Ya gastaste tus ${LIMITE_VOTOS} votos`, "error");

    const { data } = await _supabase.from('canciones').select('votos_conteo').eq('id', id).single();
    await _supabase.from('canciones').update({ votos_conteo: (data.votos_conteo || 0) + 1 }).eq('id', id);
    notificar("Voto registrado");
    cargarCanciones();
}

async function quitarVoto(id) {
    await _supabase.from('votos').delete().eq('cancion_id', id).eq('usuario_huella', usuarioID);
    const { data } = await _supabase.from('canciones').select('votos_conteo').eq('id', id).single();
    await _supabase.from('canciones').update({ votos_conteo: Math.max(0, (data.votos_conteo || 0) - 1) }).eq('id', id);
    notificar("Voto retirado", "success");
    cargarCanciones();
}


cargarCanciones();

