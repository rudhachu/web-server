const fs = require('fs');
const { Readable } = require('stream');
const axios = require('axios');

// MIME to Extension mapping with more comprehensive coverage
const mimeToExtensionMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/x-matroska': 'mkv',
    'video/webm': 'webm',
    'video/avi': 'avi',
    'video/quicktime': 'mov',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/flac': 'flac',
    'audio/x-m4a': 'm4a',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

// File-type detection using the file-type library (imported dynamically)
const fromBuffer = async () => {
    const module = await import("file-type");
    return module.fromBuffer;
};

// Buffer utilities
const buffertoJson = (buffer) => {
    return JSON.parse(buffer.toString('utf-8'));
};

const jsontoBuffer = (json) => {
    return Buffer.from(JSON.stringify(json));
};

const transformBuffer = (buffer, transformFn) => {
    return transformFn(buffer);
};

const toBuffer = (data) => {
    if (data instanceof Buffer) return data;
    if (typeof data === 'string') return Buffer.from(data);
    return Buffer.from(JSON.stringify(data));
};

// File handling utilities
const bufferToFile = async (buffer, filePath) => {
    await fs.writeFile(filePath, buffer);
};

// Stream utilities
const getBufferFromStream = async (stream) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
};

const getStreamFromBuffer = (buffer) => {
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    return readable;
};

// URL and content detection utilities
const extractUrlFromString = (str) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = str.match(urlRegex);
    return matches ? matches[0] : '';
};

const FileTypeFromBuffer = async (buffer) => {
    const fileTypeFromBuffer = await fromBuffer();
    const typeResult = await fileTypeFromBuffer(buffer);
    return typeResult ? mimeToExtensionMap[typeResult.mime] || typeResult.ext : null;
};

const FileTypeFromUrl = async (url) => {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    return await FileTypeFromBuffer(buffer);
};

const FileTypeFromBlob = async (blob) => {
    const buffer = await blob.arrayBuffer().then(Buffer.from);
    return await FileTypeFromBuffer(buffer);
};

const FileTypeFromStream = async (stream) => {
    const buffer = await getBufferFromStream(stream);
    return await FileTypeFromBuffer(buffer);
};

// Detecting content type
const detectType = async (content) => {
    let buffer;
    if (typeof content === 'string') {
        try {
            if (content.startsWith('http')) {
                const url = extractUrlFromString(content);
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                buffer = Buffer.from(response.data);
            } else {
                buffer = Buffer.from(content, 'base64');
            }
        } catch (error) {
            return 'invalid';
        }
    } else {
        buffer = content;
    }

    const fileExt = await FileTypeFromBuffer(buffer);
    if (!fileExt) return 'text';

    const typeMap = {
        image: ['jpg', 'png', 'gif', 'webp'],
        video: ['mp4', 'mkv', 'webm'],
        audio: ['mp3', 'ogg', 'wav'],
        document: ['pdf', 'doc', 'docx'],
        sticker: ['webp'],
    };

    for (const [type, patterns] of Object.entries(typeMap)) {
        if (patterns.includes(fileExt)) {
            return type;
        }
    }

    return 'unknown';
};

// HTTP request utilities
const getBuffer = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'get',
            url,
            headers: {
                DNT: 1,
                'Upgrade-Insecure-Request': 1,
                ...options.headers,
            },
            ...options,
            responseType: 'arraybuffer',
        });
        return res.data;
    } catch (error) {
        throw new Error(`Error fetching buffer: ${error.message}`);
    }
};

const getJson = async (url, options = {}) => {
    try {
        const res = await axios({
            method: 'GET',
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
                ...options.headers,
            },
            ...options,
        });
        return res.data;
    } catch (err) {
        return err;
    }
};

const postJson = async (url, data, options = {}) => {
    try {
        const res = await axios({
            method: 'POST',
            url,
            data,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
                ...options.headers,
            },
            ...options,
        });
        return res.data;
    } catch (err) {
        return err;
    }
};

module.exports = {
    buffertoJson,
    jsontoBuffer,
    transformBuffer,
    bufferToFile,
    toBuffer,
    extractUrlFromString,
    getBufferFromStream,
    getStreamFromBuffer,
    FileTypeFromUrl,
    FileTypeFromBuffer,
    FileTypeFromBlob,
    FileTypeFromStream,
    detectType,
    getBuffer,
    getJson,
    postJson,
};