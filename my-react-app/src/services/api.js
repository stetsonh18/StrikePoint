import axios from 'axios';

// Use import.meta.env for Vite environment variables
const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || 'demo';
const PERPLEXITY_API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY || '';

const finnhubClient = axios.create({
  baseURL: 'https://finnhub.io/api/v1',
  params: {
    token: FINNHUB_API_KEY,
  },
});

const perplexityClient = axios.create({
  baseURL: 'https://api.perplexity.ai',
  headers: {
    Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
  },
});

export { finnhubClient, perplexityClient };
