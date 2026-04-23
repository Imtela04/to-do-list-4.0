import { createContext, useContext, useReducer, useEffect } from "react";
import { getTasks, getCategories, getStickyNotes, getProfile } from '../api/services';

const AppContext = createContext(null);

const initialState = {
    tasks: [],  
    categories: [],
    stickyNotes: [],
    username: '',
    theme: localStorage.getItem('theme'), // || dark,
    loading: { tasks: false, categories: false, notes: false },
    error: null,
    filter: { search: '', category: null, priority: null, status: 'all' },
    greeting: localStorage.getItem('userName') || '',
};

function reducer(state, action){
    switch(action.type){
        case 'SET_TASKS': return { ...state, tasks: action.payload };
        case 'ADD_TASK': return { ...state, tasks: [action.payload, ...state.tasks] };
        case 'UPDATE_TASK': return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t) };
        case 'DELETE_TASK': return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };
        case 'SET_CATEGORIES': return { ...state, categories: action.payload };
        case 'ADD_CATEGORY': return { ...state, categories: [...state.categories, action.payload] };
        case 'DELETE_CATEGORY': return { ...state, categories: state.categories.filter(c => c.id !== action.payload) };
        case 'SET_NOTES': return { ...state, stickyNotes: action.payload };
        case 'ADD_NOTE': return { ...state, stickyNotes: [...state.stickyNotes, action.payload] };
        case 'UPDATE_NOTE': return { ...state, stickyNotes: state.stickyNotes.map(n => n.id === action.payload.id ? action.payload : n) };
        case 'DELETE_NOTE': return { ...state, stickyNotes: state.stickyNotes.filter(n => n.id !== action.payload) };
        case 'SET_FILTER': return { ...state, filter: { ...state.filter, ...action.payload } };
        case 'SET_LOADING': return { ...state, loading: { ...state.loading, ...action.payload } };
        case 'SET_ERROR': return { ...state, error: action.payload };
        case 'SET_GREETING': return { ...state, greeting: action.payload };
        case 'SET_USERNAME': return { ...state, username: action.payload };
        case 'SET_THEME': 
            localStorage.setItem('theme', action.payload);    
            return {...state, theme: action.payload};
        default: return state;
    }
}

export function AppProvider({ children }){
    const [state,dispatch] = useReducer(reducer,initialState);
    
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
            console.log('profile response:', res.data);  // ← add this
            dispatch({ type: 'SET_USERNAME', payload: res.data.username });
        } catch (err){
            console.log('profile error:', err);  // ← and this
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

    const filteredTasks = state.tasks.filter(task=>{
        const { search, category, priority, status } = state.filter;
        if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (category && task.category !== category) return false;
        if (priority && task.priority !== priority) return false;
        if (status === 'active' && task.completed) return false;
        if (status === 'completed' && !task.completed) return false;
        return true;
    });

    
    return(
        <AppContext.Provider value={{ state, dispatch, filteredTasks, loadTasks, loadCategories, loadNotes }}>
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

