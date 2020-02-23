import { pipes } from 'ultimus'

const upper = s => ('' + s).toUpperCase()
const capitalize = s => !s ? '' : s[0].toUpperCase() + s.slice(1);

export default {
    title: 'todos',
    items_left: ' item(s) left',
    clear_completed: 'Clear completed',
    hint: 'Double-click to edit a todo',
    new_todo_hint: 'What needs to be done?',
    // filters: FILTERS,
    upper,
    capitalize,
    ...pipes,
};