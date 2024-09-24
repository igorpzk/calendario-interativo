// script.js

// Seletores e variáveis globais
const calendarDays = document.getElementById('calendar-days');
const monthYear = document.getElementById('month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

const taskModal = document.getElementById('task-modal');
const closeModalBtn = document.querySelector('.close-btn');
const taskForm = document.getElementById('task-form');

const tagsContainer = document.getElementById('tags-container');

const tagInput = document.getElementById('task-tag');
const tagColorInput = document.getElementById('tag-color');
const tagSuggestions = document.getElementById('tag-suggestions');

const importFileInput = document.getElementById('import-file');
const exportButton = document.getElementById('export-button');

const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');

let date = new Date();
let currentMonth = date.getMonth();
let currentYear = date.getFullYear();

let tasks = {};
let tags = {};

let draggedTask = null;
let draggedTaskDate = null;
let draggedTaskIndex = null;

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Função para adicionar zeros à esquerda
function pad(n) {
    return n < 10 ? '0' + n : n;
}

// Funções para abrir e fechar os modais
function openRegisterModal() {
    document.getElementById('register-modal').style.display = 'block';
}

function closeRegisterModal() {
    document.getElementById('register-modal').style.display = 'none';
}

function openLoginModal() {
    document.getElementById('login-modal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

// Registrar novo usuário
registerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert('Usuário registrado com sucesso!');
            closeRegisterModal();
        })
        .catch((error) => {
            alert('Erro ao registrar: ' + error.message);
        });
});

// Login do usuário
// Adicionar o listener de submit
loginForm.addEventListener('submit', function (e) {
  e.preventDefault(); // Prevenir o comportamento padrão do formulário

  // Obter os valores dos campos de email e senha
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  // Usar o Firebase Authentication para fazer login
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Login bem-sucedido
      alert('Login realizado com sucesso!');
      closeLoginModal(); // Fechar o modal de login
    })
    .catch((error) => {
      // Tratar erros
      const errorCode = error.code;
      const errorMessage = error.message;
      alert('Erro ao fazer login: ' + errorMessage);
      console.error('Erro de login:', errorCode, errorMessage);
    });
});

// Função para fazer logout
function logoutUser() {
saveUserData(); 
    firebase.auth().signOut()
        .then(() => {
            alert('Logout realizado com sucesso!');
        })
        .catch((error) => {
            alert('Erro ao fazer logout: ' + error.message);
        });
}

// Observar mudanças na autenticação
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // Usuário está logado
        console.log('Usuário logado:', user.email);
        logoutButton.style.display = 'block';
        loadUserData();
    } else {
        // Usuário não está logado
        console.log('Usuário não está logado');
        logoutButton.style.display = 'none';
        tasks = {};
        tags = {};
        renderCalendar(currentMonth, currentYear);
        updateTags();
    }
});

// Carregar dados do usuário do Firestore
function loadUserData() {
  const user = firebase.auth().currentUser;
  if (user) {
    const db = firebase.firestore();
    const userDocRef = db.collection('users').doc(user.uid);

    userDocRef.get()
      .then((doc) => {
        if (doc.exists) {
          const data = doc.data();
          tasks = data.tasks || {};
          tags = data.tags || {};
          renderCalendar(currentMonth, currentYear);
          updateTags();
        } else {
          // Documento não existe, iniciar com dados vazios
          tasks = {};
          tags = {};
          renderCalendar(currentMonth, currentYear);
          updateTags();
        }
      })
      .catch((error) => {
        console.log('Erro ao carregar dados:', error);
      });
  }
}

// Salvar dados do usuário no Firestore
function saveUserData() {
    const user = firebase.auth().currentUser;
    if (user) {
        const db = firebase.firestore();
        const userDocRef = db.collection('users').doc(user.uid);

        userDocRef.set({ tasks: tasks, tags: tags })
            .then(() => {
                console.log('Dados salvos com sucesso!');
            })
            .catch((error) => {
                console.log('Erro ao salvar dados:', error);
            });
    } else {
        console.log('Usuário não está autenticado.');
    }
}

// Função para renderizar o calendário
function renderCalendar(month, year) {
    calendarDays.innerHTML = ''; // Limpar os dias anteriores
    monthYear.textContent = `${months[month]} ${year}`;

    // Primeiro dia do mês atual
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayIndex = firstDayOfMonth.getDay();

    // Último dia do mês anterior
    const prevLastDay = new Date(year, month, 0).getDate();

    // Número de dias no mês atual
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Número de dias do próximo mês a exibir
    const totalCells = 42; // 7 dias * 6 semanas
    const prevDays = firstDayIndex;
    const nextDays = totalCells - (prevDays + daysInMonth);

    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    // Preencher dias do mês anterior
    for (let x = prevDays; x > 0; x--) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('other-month');
        const dayNumber = document.createElement('div');
        dayNumber.classList.add('day-number');
        const day = prevLastDay - x + 1;
        dayNumber.textContent = day;
        dayDiv.appendChild(dayNumber);

        const fullDate = `${prevYear}-${pad(prevMonth + 1)}-${pad(day)}`;

        // Verificar e adicionar tarefas se houver
        if (tasks[fullDate]) {
            tasks[fullDate].forEach((task, index) => {
                const taskPreview = createTaskPreview(task, fullDate, index);
                dayDiv.appendChild(taskPreview);
            });
        }

        addDayEventListeners(dayDiv, fullDate);

        calendarDays.appendChild(dayDiv);
    }

    // Preencher os dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');

        const dayNumber = document.createElement('div');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = day;
        dayDiv.appendChild(dayNumber);

        const fullDate = `${year}-${pad(month + 1)}-${pad(day)}`;

        if (
            day === date.getDate() &&
            month === date.getMonth() &&
            year === date.getFullYear()
        ) {
            dayDiv.classList.add('today');
        }

        // Exibir tarefas como texto
        if (tasks[fullDate]) {
            tasks[fullDate].forEach((task, index) => {
                const taskPreview = createTaskPreview(task, fullDate, index);
                dayDiv.appendChild(taskPreview);
            });
        }

        addDayEventListeners(dayDiv, fullDate);

        calendarDays.appendChild(dayDiv);
    }

    // Preencher dias do próximo mês
    for (let y = 1; y <= nextDays; y++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('other-month');
        const dayNumber = document.createElement('div');
        dayNumber.classList.add('day-number');
        dayNumber.textContent = y;
        dayDiv.appendChild(dayNumber);

        const fullDate = `${nextYear}-${pad(nextMonth + 1)}-${pad(y)}`;

        // Verificar e adicionar tarefas se houver
        if (tasks[fullDate]) {
            tasks[fullDate].forEach((task, index) => {
                const taskPreview = createTaskPreview(task, fullDate, index);
                dayDiv.appendChild(taskPreview);
            });
        }

        addDayEventListeners(dayDiv, fullDate);

        calendarDays.appendChild(dayDiv);
    }
}

// Função para criar o preview de uma tarefa
function createTaskPreview(task, fullDate, index) {
    const taskPreview = document.createElement('div');
    taskPreview.classList.add('task-preview');
    taskPreview.style.backgroundColor = task.color;

    // Se a tarefa estiver concluída, adicionar a classe 'completed'
    if (task.completed) {
        taskPreview.classList.add('completed');
        taskPreview.style.borderLeftColor = task.color;
    }

    const taskDesc = task.time ? `${task.time} - ${task.desc}` : task.desc;
    taskPreview.textContent = capitalizeFirstLetter(taskDesc);

    // Adicionar atributos para drag and drop
    taskPreview.setAttribute('draggable', 'true');

    taskPreview.addEventListener('dragstart', (e) => {
        draggedTask = task;
        draggedTaskDate = fullDate;
        draggedTaskIndex = index;
        e.dataTransfer.setData('text/plain', '');
    });

    return taskPreview;
}

// Função para adicionar eventos de dragover, drop e click aos dias
function addDayEventListeners(dayDiv, fullDate) {
    // Eventos de dragover e drop nos dias
    dayDiv.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    dayDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedTask) {
            // Remover a tarefa da data antiga
            tasks[draggedTaskDate].splice(draggedTaskIndex, 1);
            if (tasks[draggedTaskDate].length === 0) {
                delete tasks[draggedTaskDate];
            }

            // Adicionar a tarefa à nova data
            if (!tasks[fullDate]) {
                tasks[fullDate] = [];
            }
            tasks[fullDate].push(draggedTask);

            // Atualizar currentMonth e currentYear se necessário
            const newDate = new Date(fullDate);
            currentMonth = newDate.getMonth();
            currentYear = newDate.getFullYear();

            // Salvar dados e atualizar o calendário
            saveUserData();
            renderCalendar(currentMonth, currentYear);

            // Resetar variáveis
            draggedTask = null;
            draggedTaskDate = null;
            draggedTaskIndex = null;
        }
    });

    dayDiv.addEventListener('click', () => openTaskModal(fullDate, dayDiv));
}

// Navegar para o mês anterior
prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentYear--;
        currentMonth = 11;
    }
    renderCalendar(currentMonth, currentYear);
});

// Navegar para o próximo mês
nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentYear++;
        currentMonth = 0;
    }
    renderCalendar(currentMonth, currentYear);
});

// Abrir o modal de tarefas
function openTaskModal(dateStr, dayDiv) {
    taskModal.style.display = 'block';
    document.getElementById('task-date').value = dateStr;
    showTasks(dateStr);
}

// Fechar o modal de tarefas
closeModalBtn.onclick = function() {
    taskModal.style.display = 'none';
    taskForm.reset();
    const taskList = document.querySelector('.task-list');
    if (taskList) taskList.remove();
    tagSuggestions.innerHTML = '';

    // Remover atributos de edição
    taskForm.removeAttribute('data-editing');
    taskForm.removeAttribute('data-date');
    taskForm.removeAttribute('data-index');

    // Redefinir o título do modal
    const modalTitle = taskModal.querySelector('h3');
    modalTitle.textContent = 'Adicionar Tarefa';
}

window.onclick = function(event) {
    if (event.target == taskModal) {
        taskModal.style.display = 'none';
        taskForm.reset();
        const taskList = document.querySelector('.task-list');
        if (taskList) taskList.remove();
        tagSuggestions.innerHTML = '';

        // Remover atributos de edição
        taskForm.removeAttribute('data-editing');
        taskForm.removeAttribute('data-date');
        taskForm.removeAttribute('data-index');

        // Redefinir o título do modal
        const modalTitle = taskModal.querySelector('h3');
        modalTitle.textContent = 'Adicionar Tarefa';
    }
}

// Função para capitalizar a primeira letra
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Submissão do formulário de tarefa
taskForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const dateStr = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value;
    const desc = document.getElementById('task-desc').value;
    const tag = document.getElementById('task-tag').value;
    const color = document.getElementById('tag-color').value;

    const task = { time, desc, tag, color, completed: false };

    // Verificar se estamos editando uma tarefa existente
    if (taskForm.getAttribute('data-editing') === 'true') {
        const originalDate = taskForm.getAttribute('data-date');
        const taskIndex = taskForm.getAttribute('data-index');

        // Se a data não mudou, atualizar a tarefa existente
        if (originalDate === dateStr) {
            tasks[dateStr][taskIndex] = task;
			
        } else {
            // Se a data mudou, mover a tarefa para a nova data
            tasks[originalDate].splice(taskIndex, 1);
            if (tasks[originalDate].length === 0) {
                delete tasks[originalDate];
            }
            if (!tasks[dateStr]) {
                tasks[dateStr] = [];
            }
            tasks[dateStr].push(task);
        }

        // Remover atributos de edição
        taskForm.removeAttribute('data-editing');
        taskForm.removeAttribute('data-date');
        taskForm.removeAttribute('data-index');
    } else {
        // Adicionar nova tarefa
        if (!tasks[dateStr]) {
            tasks[dateStr] = [];
        }
        tasks[dateStr].push(task);
    }

    // Armazenar e exibir Tags
    if (!tags[tag]) {
        tags[tag] = color;
        updateTags();
    }

    saveUserData(); // Salvar dados no Firestore

    taskForm.reset();
    tagSuggestions.innerHTML = '';
    renderCalendar(currentMonth, currentYear);
    showTasks(dateStr);

    // Redefinir o título do modal
    const modalTitle = taskModal.querySelector('h3');
    modalTitle.textContent = 'Adicionar Tarefa';
});

// Função para mostrar as tarefas
function showTasks(dateStr) {
    // Remover a lista de tarefas existente antes de adicionar uma nova
    const existingList = document.querySelector('.task-list');
    if (existingList) existingList.remove();

    if (tasks[dateStr]) {
        const modalContent = document.querySelector('.modal-content');
        const taskList = document.createElement('div');
        taskList.classList.add('task-list');

        tasks[dateStr].forEach((task, index) => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('task-item');
            taskItem.style.borderLeftColor = task.color;

            // Se a tarefa estiver concluída, adicionar a classe 'completed'
            if (task.completed) {
                taskItem.classList.add('completed');
            }

            // Checkbox para marcar tarefa como concluída
            const completeCheckbox = document.createElement('input');
            completeCheckbox.type = 'checkbox';
            completeCheckbox.classList.add('complete-task-checkbox');
            completeCheckbox.checked = task.completed;
            completeCheckbox.addEventListener('change', () => toggleTaskCompletion(dateStr, index));
            taskItem.appendChild(completeCheckbox);

            const taskTitle = document.createElement('h4');
            const taskDesc = task.time ? `${task.time} - ${task.desc}` : task.desc;
            taskTitle.textContent = capitalizeFirstLetter(taskDesc);
            taskItem.appendChild(taskTitle);

            const taskTag = document.createElement('span');
            taskTag.classList.add('tag');
            taskTag.textContent = task.tag;
            taskTag.style.backgroundColor = task.color;
            taskItem.appendChild(taskTag);

            // Botão de editar tarefa
            const editBtn = document.createElement('button');
            editBtn.classList.add('edit-task');
            editBtn.innerHTML = '&#9998;'; // Ícone de lápis para edição
            editBtn.addEventListener('click', () => editTask(dateStr, index));
            taskItem.appendChild(editBtn);

            // Botão de excluir tarefa
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-task');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.addEventListener('click', () => deleteTask(dateStr, index));
            taskItem.appendChild(deleteBtn);

            taskList.appendChild(taskItem);
        });

        modalContent.appendChild(taskList);
    }
}

// Função para editar tarefa
function editTask(dateStr, taskIndex) {
    const task = tasks[dateStr][taskIndex];

    // Preencher o formulário com os dados da tarefa
    document.getElementById('task-date').value = dateStr;
    document.getElementById('task-time').value = task.time;
    document.getElementById('task-desc').value = task.desc;
    document.getElementById('task-tag').value = task.tag;
    document.getElementById('tag-color').value = task.color;

    // Definir atributos para indicar que estamos editando
    taskForm.setAttribute('data-editing', 'true');
    taskForm.setAttribute('data-date', dateStr);
    taskForm.setAttribute('data-index', taskIndex);

    // Alterar o título do modal
    const modalTitle = taskModal.querySelector('h3');
    modalTitle.textContent = 'Editar Tarefa';

    // Abrir o modal se não estiver aberto
    taskModal.style.display = 'block';

    // Atualizar a lista de tarefas
    showTasks(dateStr);
}

// Função para excluir tarefa
function deleteTask(dateStr, taskIndex) {
    tasks[dateStr].splice(taskIndex, 1);
    if (tasks[dateStr].length === 0) {
        delete tasks[dateStr];
    }

    saveUserData(); // Salvar dados no Firestore

    renderCalendar(currentMonth, currentYear);
    showTasks(dateStr);
}

// Função para alternar o estado de conclusão da tarefa
function toggleTaskCompletion(dateStr, taskIndex) {
    tasks[dateStr][taskIndex].completed = !tasks[dateStr][taskIndex].completed;
    saveUserData();
    renderCalendar(currentMonth, currentYear);
    showTasks(dateStr);
}

// Função para atualizar as tags exibidas
function updateTags() {
    tagsContainer.innerHTML = ''; // Limpar as tags existentes
    for (const tagName in tags) {
        const tagItem = document.createElement('div');
        tagItem.classList.add('tag-item');
        tagItem.textContent = tagName;
        tagItem.style.backgroundColor = tags[tagName];
        tagsContainer.appendChild(tagItem);
    }
}

// Função para exibir sugestões de tags
tagInput.addEventListener('input', function() {
    const inputValue = this.value.toLowerCase();
    tagSuggestions.innerHTML = '';

    if (inputValue === '') {
        return;
    }

    for (const tagName in tags) {
        if (tagName.toLowerCase().includes(inputValue)) {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('tag-suggestion-item');
            suggestionItem.textContent = tagName;

            const colorCircle = document.createElement('div');
            colorCircle.classList.add('tag-color-circle');
            colorCircle.style.backgroundColor = tags[tagName];
            suggestionItem.appendChild(colorCircle);

            suggestionItem.addEventListener('click', function() {
                tagInput.value = tagName;
                tagColorInput.value = tags[tagName];
                tagSuggestions.innerHTML = '';
            });

            tagSuggestions.appendChild(suggestionItem);
        }
    }
});

// Limpar sugestões ao clicar fora do campo de tag
document.addEventListener('click', function(event) {
    if (!tagInput.contains(event.target) && !tagSuggestions.contains(event.target)) {
        tagSuggestions.innerHTML = '';
    }
});

// Função para importar tarefas
importFileInput.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const importedData = JSON.parse(e.target.result);
          if (importedData.tasks && importedData.tags) {
            tasks = importedData.tasks;
            tags = importedData.tags;
            updateTags();
			saveUserData(); // Salvar dados importados no Firestore
            renderCalendar(currentMonth, currentYear);
            alert('Tarefas importadas com sucesso!');
          } else {
            alert('O arquivo não está no formato correto.');
          }
        } catch (error) {
          alert('Erro ao ler o arquivo. Certifique-se de que é um arquivo JSON válido.');
        }
      };
      reader.readAsText(file);
    } else {
      alert('Por favor, selecione um arquivo JSON.');
    }
  }
});


// Função para exportar tarefas
exportButton.addEventListener('click', function() {
    const data = {
        tasks: tasks,
        tags: tags
    };

    const dataStr = JSON.stringify(data, null, 2); // Formatar com espaçamento para legibilidade
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Criar um link temporário para download
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tarefas.json';
    document.body.appendChild(link);
    link.click();

    // Remover o link e liberar o objeto URL
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});

// Inicialização
renderCalendar(currentMonth, currentYear);
