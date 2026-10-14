import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export default api;

export async function getHealth() {
  try {
    const res = await api.get('/health');
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Failed to reach health endpoint');
  }
}

export async function getOverview() {
  try {
    const res = await api.get('/analytics/overview');
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Failed to load overview data');
  }
}

export async function getGroups() {
  try {
    const res = await api.get('/analytics/groups');
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Failed to load groups data');
  }
}

export async function getMetrics() {
  try {
    const res = await api.get('/model/metrics');
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Failed to load model metrics');
  }
}

export async function postPredict(inputObj) {
  try {
    const res = await api.post('/predict', inputObj);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Prediction request failed — backend may be unavailable');
  }
}

export async function postExplain(inputObj) {
  try {
    const res = await api.post('/explain', inputObj);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || 'Explainability request failed');
  }
}
