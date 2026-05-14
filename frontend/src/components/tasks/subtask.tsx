import { useState, useRef, useEffect } from 'react';
import { createSubtask, updateSubtask, deleteSubtask } from '@/api/services';
import type { Task } from '@/types';


const SUBTASK_LIMIT = 10;

export default function Subtask({ subtasks }: { subtasks: Subtask; index: number }) {
    const [newSubtaskTitle, setNewSubtaskTitle]     = useState('');
    const [addingSubtask, setAddingSubtask]         = useState(false);
    const subtaskInputRef = useRef<HTMLInputElement>(null);

    // const subtasks       = task.subtasks ?? [];
    const completedCount = subtasks.filter(s => s.completed).length;
    const hasSubtasks    = subtasks.length > 0;
    const atSubtaskLimit = subtasks.length >= SUBTASK_LIMIT;
    const allDone        = hasSubtasks && completedCount === subtasks.length;

    
    useEffect(() => {
        if (addingSubtask) subtaskInputRef.current?.focus();
    }, [addingSubtask]);
    

}
    