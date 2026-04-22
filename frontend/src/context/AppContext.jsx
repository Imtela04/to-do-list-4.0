import { createContext, useContext, useReducer, useEffect } from "react";
import { getTasks, getCategoies, getStickyNotes } from "../api/services";

const AppContext = createContext(null);

const initialState = {
    tasks: [],  
    categories: [],
    stickyNotes: [],
    loading: { tasks: false, categories: false, notes: false },
    error: null,
    filter: { search: '', category: null, priority: null, status: 'all' },
    greeting: localStorage.getItem('userName') || 'Friend',
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
        default: return state;
    }
}

export function AppProvider({ children }){
    
}