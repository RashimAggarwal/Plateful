import axios from 'axios';
const runtimeApiUrl=window.__PLATEFUL_CONFIG__?.apiUrl;
const defaultApiUrl=import.meta.env.DEV?'http://localhost:4000/api':'/api';
export const api=axios.create({baseURL:runtimeApiUrl||import.meta.env.VITE_API_URL||defaultApiUrl});
api.interceptors.request.use(c=>{const t=localStorage.getItem('plateful-token');if(t)c.headers.Authorization=`Bearer ${t}`;return c});
export const data=async p=>(await p).data.data;
