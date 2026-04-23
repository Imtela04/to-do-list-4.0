import { useApp } from '@/context/AppContext';
import TaskCard from './taskcard';
import AddTask from './addtask';
import FilterBar from '@/components/layout/filterbar';
import styles from './tasklist.module.css';

export default function TaskList() {
  const { filteredTasks, state } = useApp();
  console.log('tasks:', state.tasks);
  console.log('filteredTasks:', filteredTasks);
  console.log('loading:', state.loading.tasks);
  return (
    <div className={styles.container}>
      <FilterBar />

      <AddTask />

      <div className={styles.list}>
        {state.loading.tasks ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>✓</span>
            <p className={styles.emptyTitle}>
              {state.filter.search || state.filter.category || state.filter.priority
                ? 'No tasks match your filters'
                : state.filter.status === 'completed'
                ? 'No completed tasks yet'
                : 'All clear! Add a task above.'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task, i) => (
            <TaskCard key={task.id} task={task} index={i} />
          ))
        )}
      </div>

      {filteredTasks.length > 0 && (
        <p className={styles.count}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
          {state.filter.status !== 'all' ? ` ${state.filter.status}` : ''}
        </p>
      )}
    </div>
  );
}
