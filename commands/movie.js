const axios = require('axios');

async function movieCommand(sock, chatId, message, args) {
    try {
        const query = args.join(' ').trim();
        if (!query) {
            await sock.sendMessage(chatId, { text: '❌ Usage: .movie <movie name>' }, { quoted: message });
            return;
        }

        const url = `http://www.omdbapi.com/?apikey=742b2d09&t=${encodeURIComponent(query)}&plot=full`;
        const { data: movie } = await axios.get(url);

        if (!movie || movie.Response !== 'True') {
            await sock.sendMessage(chatId, { text: '❌ Movie not found!' }, { quoted: message });
            return;
        }

        const posterUrl = movie.Poster;
        delete movie.Poster;
        delete movie.Response;
        delete movie.Ratings;

        let msg = '';
        for (const key in movie) {
            if (movie[key] !== 'N/A') {
                msg += `*${key} :* ${movie[key]}\n`;
            }
        }

        msg = msg.trim();

        if (!posterUrl || posterUrl === 'N/A') {
            await sock.sendMessage(chatId, { text: msg }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, {
                image: { url: posterUrl },
                caption: msg
            }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in movie command:', error);
        await sock.sendMessage(chatId, { text: '❌ Error fetching movie details.' }, { quoted: message });
    }
}

module.exports = movieCommand;
