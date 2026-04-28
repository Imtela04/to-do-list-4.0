import { createContext, useContext, useReducer, useEffect } from "react";
import { getTasks, getCategories, getStickyNotes, getProfile } from '../api/services';

export const AppContext = createContext(null);
const savedFilter = (() => {
  try { return JSON.parse(localStorage.getItem('taskFilter')) || {}; }
  catch { return {}; }
})();

const initialState = {
    tasks: [],  
    categories: [],
    stickyNotes: [],
    username: '',
    theme: localStorage.getItem('theme'), // || dark,
    loading: { tasks: false, categories: false, notes: false },
    error: null,
    filter: {
        search: '',           // never persist search
        category: null,
        priority: null,
        status: 'all',
        sort: 'newest',
        deadlineDay: null,    // never persist calendar selection
        dateFrom: savedFilter.dateFrom || null,
        dateTo: savedFilter.dateTo || null,
        ...savedFilter,
        search: '',           // force clear search on reload
        deadlineDay: null,    // force clear calendar on reload
    },

    greeting: localStorage.getItem('userName') || '',
};

function reducer(state, action){
    switch(action.type){
        case 'SET_TASKS': return { ...state, tasks: action.payload };
        case 'ADD_TASK': return { ...state, tasks: [action.payload, ...state.tasks] };
        case 'UPDATE_TASK': return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t) };        case 'DELETE_TASK': return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };
        case 'SET_CATEGORIES': return { ...state, categories: action.payload };
        case 'ADD_CATEGORY': return { ...state, categories: [...state.categories, action.payload] };
        case 'DELETE_CATEGORY': return { ...state, categories: state.categories.filter(c => c.id !== action.payload) };
        case 'SET_NOTES': return { ...state, stickyNotes: action.payload };
        case 'ADD_NOTE': return { ...state, stickyNotes: [...state.stickyNotes, action.payload] };
        case 'UPDATE_NOTE': return { ...state, stickyNotes: state.stickyNotes.map(n => n.id === action.payload.id ? action.payload : n) };
        case 'DELETE_NOTE': return { ...state, stickyNotes: state.stickyNotes.filter(n => n.id !== action.payload) };
        case 'SET_FILTER': {
        const updated = { ...state.filter, ...action.payload };
            // save everything except search and deadlineDay
            const { search, deadlineDay, ...toSave } = updated;
            localStorage.setItem('taskFilter', JSON.stringify(toSave));
            return { ...state, filter: updated };
        }   
        case 'SET_LOADING': return { ...state, loading: { ...state.loading, ...action.payload } };
        case 'SET_ERROR': return { ...state, error: action.payload };
        case 'SET_GREETING': return { ...state, greeting: action.payload };
        case 'SET_USERNAME': return { ...state, username: action.payload };
        case 'SET_THEME': 
            localStorage.setItem('theme', action.payload);    
            return {...state, theme: action.payload};
        case 'RESET':
            return {
                ...initialState,
                // clear localStorage-seeded values too
                theme: 'dark',
                greeting: '',
            };
        default: return state;
    }
}

export function AppProvider({ children }){
    const [state,dispatch] = useReducer(reducer,initialState);

    const resetState = () => {
        dispatch({ type: 'RESET' });
        localStorage.removeItem('theme');
        localStorage.removeItem('userName');
    };
    const loadTasks = async()=>{
        dispatch({ type: 'SET_LOADING', payload: { tasks: true } });
        try{
            const res = await getTasks();
            dispatch({ type: 'SET_TASKS', payload: res.data.results || res.data });
        }catch{
            // mock data if API not ready
            dispatch({ type: 'SET_TASKS', payload: mockTasks });
        }finally{
            dispatch({ type: 'SET_LOADING', payload: { tasks:false }});
        }
    };
    const loadCategories = async()=>{
        try{
            const res = await getCategories();
            dispatch({ type: 'SET_CATEGORIES', payload: res.data });
        }catch{
            dispatch({ type: 'SET_CATEGORIES', payload: mockCategories });
        }
    };
    const loadNotes = async()=>{
        try{
            const res = await getStickyNotes();
            dispatch({ type: 'SET_NOTES', payload: res.data });
        }catch{
            dispatch({ type: 'SET_NOTES', payload: mockCategories });
        }
    };
    const loadUsername = async () => {
        try {
            const res = await getProfile();  // already in services.js
            // console.log('profile response:', res.data);  // ← add this
            dispatch({ type: 'SET_USERNAME', payload: res.data.username });
        } catch (err){
            // console.log('profile error:', err);  // ← and this
        }
    };


    useEffect(()=>{
        const token = localStorage.getItem('authToken');
        if (!token) return;  // ← don't fetch if not logged in

        loadTasks();
        loadCategories();
        loadNotes();
        loadUsername();
    }, []);

    const filteredTasks = state.tasks
     .filter(task => {
        const { search, category, priority, status, dateFrom, dateTo } = state.filter; // 👈 state.filter not filter
        if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (category === 'uncategorised') {
        if (task.category) return false;
        } else if (category) {
        if (task.category?.id !== category) return false;
        }        if (priority && task.priority !== priority) return false;
        if (status === 'active' && task.completed) return false;
        if (status === 'completed' && !task.completed) return false;
        if (dateFrom && task.deadline && new Date(task.deadline) < new Date(dateFrom)) return false;
        if (dateTo && task.deadline && new Date(task.deadline) > new Date(dateTo)) return false;

        if (state.filter.deadlineDay) {
            const { year, month, day } = state.filter.deadlineDay;
            if (!task.deadline) return false;
            const d = new Date(task.deadline);
            if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return false;
        }
        return true;
    })
    .sort((a, b) => {
        switch (state.filter.sort) {
        case 'newest':   return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':   return new Date(a.created_at) - new Date(b.created_at);
        case 'priority': {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
        }
        case 'deadline': {
            // nulls go to the end
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        }
        case 'alpha':    return a.title.localeCompare(b.title);
        default:         return 0;
        }
    });
    
    return(
// add resetState to provider value
    <AppContext.Provider value={{ state, dispatch, filteredTasks, loadTasks, loadCategories, loadNotes, loadUsername, resetState }}>
        {children}
    </AppContext.Provider>
    );

}

export const useApp = ()=>{
    const ctx = useContext(AppContext);
    if(!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}

//  Mock data for development (before API is ready)
const mockTasks = [
  { id: 1, title: 'Set up Django REST Framework', completed: true, priority: 'high', category: 1, due_date: '2025-04-25', created_at: new Date().toISOString() },
  { id: 2, title: 'Build authentication endpoints', completed: false, priority: 'critical', category: 1, due_date: '2025-04-28', created_at: new Date().toISOString() },
  { id: 3, title: 'Design database schema', completed: false, priority: 'medium', category: 2, due_date: '2025-04-30', created_at: new Date().toISOString() },
  { id: 4, title: 'Connect frontend to API', completed: false, priority: 'high', category: 1, due_date: '2025-05-02', created_at: new Date().toISOString() },
  { id: 5, title: 'Write unit tests', completed: false, priority: 'low', category: 2, due_date: '2025-05-10', created_at: new Date().toISOString() },
];
const mockCategories = [
  { id: 1, name: 'Development', color: '#7c6aff' },
  { id: 2, name: 'Design', color: '#ff6a9e' },
  { id: 3, name: 'Personal', color: '#6affdc' },
];

const mockNotes = [
  { id: 1, content: 'Remember to add CORS headers to Django settings!', color: '#7c6aff', created_at: new Date().toISOString() },
  { id: 2, content: 'Use djangorestframework-simplejwt for auth tokens', color: '#ff6a9e', created_at: new Date().toISOString() },
];

