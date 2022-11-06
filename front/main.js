
const FADE_TIME = 150; // ms
const TYPING_TIMER_LENGTH = 400; // ms
const COLORS = [
  '#e21400', '#91580f', '#f8a700', '#f78b00',
  '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
  '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
];

// Initialize variables
const container = document.querySelector('.container')
const usernameList = document.querySelector('.username-list')
const statusBar = document.querySelector('.status')
const loading = document.querySelector('.loading')
const usernameInput = document.querySelector('.usernameInput'); // Input for username
const messages = document.querySelector('.messages');           // Messages area
const inputMessage = document.querySelector('.inputMessage');   // Input message input box

const loginPage = document.querySelector('.login.page');        // The login page
const chatPage = document.querySelector('.chat.page');          // The chatroom page

const socket = io();

// Prompt for setting a username
let username;
let connected = false;
let typing = false;
let lastTypingTime;

/**
 * Fade animation
 * @param {HTMLElement} el 
 */
const fadeOutElement = async (el) => {
  el.classList.add('fade-out')
  const t = setTimeout(() => {
    el.classList.add('d-none')
    clearTimeout(t)
  }, 1000);
}
const fadeInElement = (el) => {
  el.classList.add('fade-in')
  const t = setTimeout(() => {
    el.classList.remove('d-none')
    clearTimeout(t)
  }, 1000);
}
/**
 * handle data
 */
const getString = (data) => {
  return typeof data === 'string' ? data : data.innerText
}
/** 
 * message time
*/
const getMessageDate = () => {
  const time = new Date()
  return `${time.getHours()}:${time.getMinutes()}`
}
const generateRandomColor = () => {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}
/**
 * @param {*} data 
 */
const addParticipantsMessage = (data) => {
  let message = '';
  if (data.numUsers === 1) {
    message += `there's 1 participant`;
  } else {
    message += `there are ${data.numUsers} participants`;
  }
  log(message);
}

// Sets the client's username
// Focus input when clicking anywhere on login page
const handleFocus = (event) => {
  usernameInput.focus();
}
loginPage.addEventListener('click', () => handleFocus);

const createUserInList = (username) => {
  const div = document.createElement("div");
  div.classList.add(username)
  div.classList.add('fade-in')
  const avatar = document.createElement("div");
  avatar.classList.add('avatar')
  avatar.style.background = generateRandomColor()
  const name = document.createElement("div");
  name.classList.add('name')
  name.innerText = username;
  div.append(avatar, name);
  usernameList.appendChild(div)
}
const removeUserInList = (username) => {
  const usernameItem = usernameList.querySelector(`.${username}`)
  fadeOutElement(usernameItem).then(() => {
    usernameList.removeChild(usernameItem)
  })
}
const setUsername = () => {
  username = localStorage.getItem('username') ? localStorage.getItem('username') : usernameInput.value.trim();
  // If the username is valid
  if (!!username) {
    fadeOutElement(loginPage)
    chatPage.classList.remove('d-none')
    loginPage.removeEventListener('click', handleFocus);
    inputMessage.focus();
    localStorage.setItem('username', username)
    // Tell the server your username
    socket.emit('add user', username);
  }
  createUserInList(username)
}

// Sends a chat message
const sendMessage = () => {
  const message = inputMessage.value;
  // Prevent markup from being injected into the message
  // if there is a non-empty message and a socket connection
  if (message && connected) {
    inputMessage.value = ''
    addChatMessage({ username, message });
    // tell server to execute 'new message' and send along one parameter
    socket.emit('new message', message.innerText);
  }
}

// Log a message
const log = (message, options) => {
  const div = document.createElement("div");
  div.classList.add('log')
  div.innerHTML = message
  addMessageElement(div, options);
}

const addMessageElement = (el, options) => {
  // Setup default options
  if (!options) {
    options = {};
  }
  if (typeof options.fade === 'undefined') {
    options.fade = true;
  }
  if (typeof options.prepend === 'undefined') {
    options.prepend = false;
  }

  // Apply options
  if (options.fade) {
    // el.classList.add('d-none')
  }
  if (options.prepend) {
    messages.prepend(el)
  } else {
    messages.append(el);
  }

  messages.children[0].scrollTop = messages.children[0].scrollHeight;
}
// Gets the 'X is typing' messages of a user
const getTypingMessages = (data) => {
  return document.querySelector('.typing.message').filter(function (i) {
    return $(this).data('username') === data.username;
  });
}
// Adds the visual chat message to the message list
const addChatMessage = (data, options = {}) => {
  // username
  const usernameDiv = document.createElement('span')
  usernameDiv.classList.add('username')
  usernameDiv.classList.add('talk-bubble__creator')
  usernameDiv.innerText = data.username
  // message body
  const messageBodyDiv = document.createElement('span')
  messageBodyDiv.classList.add('messageBody')
  messageBodyDiv.innerText = data.message
  // date
  const dateDiv = document.createElement('span')
  dateDiv.classList.add('talk-bubble__date')
  dateDiv.innerText = getMessageDate()
  //
  const typingClass = data.typing ? 'typing' : '';
  const messageDiv = document.createElement("div")
  messageDiv.classList.add("talk-bubble")
  messageDiv.classList.add("fade-in")
  messageDiv.classList.add(data.username === username ? 'sender' : 'receiver')
  if (typingClass) messageDiv.classList.add(typingClass)
  messageDiv.append(usernameDiv, messageBodyDiv, dateDiv)
  addMessageElement(messageDiv, options);
}

// Updates the typing event
const updateTyping = () => {
  if (connected) {
    if (!typing) {
      typing = true;
      socket.emit('typing');
    }
    lastTypingTime = (new Date()).getTime();

    setTimeout(() => {
      const typingTimer = (new Date()).getTime();
      const timeDiff = typingTimer - lastTypingTime;
      if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
        socket.emit('stop typing');
        typing = false;
      }
    }, TYPING_TIMER_LENGTH);
  }
}

// Gets the color of a username through our hash function
const getUsernameColor = (username) => {
  // Compute hash code
  let hash = 7;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + (hash << 5) - hash;
  }
  // Calculate color
  const index = Math.abs(hash % COLORS.length);
  return COLORS[index];
}

// window 
window.onload = () => {
  if (localStorage.getItem('username')) {
    loginPage.classList.add('d-none')
    setUsername()
  }
  const t = setTimeout(() => {
    fadeOutElement(loading)
    clearTimeout(t)
  }, 1000);
}
window.onkeydown = (event) => {
  // Auto-focus the current input when a key is typed
  if (!(event.ctrlKey || event.metaKey || event.altKey)) {
    usernameInput.focus();
  }
  // When the client hits ENTER on their keyboard
  if (event.which === 13) {
    if (username) {
      sendMessage();
      socket.emit('stop typing');
      typing = false;
    } else {
      setUsername();
      localStorage.setItem('username', usernameInput.value)
    }
  }
}

// inputs
inputMessage.addEventListener('input', () => {
  updateTyping();
});

// Focus input when clicking on the message input's border
inputMessage.addEventListener('click', () => {
  inputMessage.focus();
})

// Socket events

// Whenever the server emits 'login', log the login message
socket.on('login', (data) => {
  connected = true;
  // Display the welcome message
  const message = 'Welcome to Socket.IO Chat – ';
  log(message, {
    prepend: true
  });
  addParticipantsMessage(data);
});

// Whenever the server emits 'new message', update the chat body
socket.on('new message', (data) => {
  addChatMessage(data);
});

// Whenever the server emits 'user joined', log it in the chat body
socket.on('user joined', (data) => {
  createUserInList(data.username)
  log(`${data.username} joined`);
  addParticipantsMessage(data);
});

// Whenever the server emits 'user left', log it in the chat body
socket.on('user left', (data) => {
  removeUserInList(data.username)
  log(`${data.username} left`);
  addParticipantsMessage(data);
  // removeChatTyping(data);
});

// socket handle error
socket.on('disconnect', () => {
  log('you have been disconnected');
});

socket.io.on('reconnect', () => {
  log('you have been reconnected');
  if (username) {
    socket.emit('add user', username);
  }
});

socket.io.on('reconnect_error', () => {
  log('attempt to reconnect has failed');
});



/**
 * Handling is typing mode
 */
const typingUsers = {}
const onTyping = (username) => {
  if (!(username in typingUsers)) {
    const p = document.createElement("p");
    typingUsers[username] = p
    const typings = Object.keys(typingUsers).map(i => i.replace(' ', '-'))
    p.classList.add(`${typings.join(',')}-typing`)
    p.classList.add('fade-in')
    p.innerText = `${username} is typing ...`
    statusBar.appendChild(p)
  }
}
socket.on('typing', (data) => {
  onTyping(data.username);
});

const endTyping = (username) => {
  if (username in typingUsers && statusBar.children.length > 0) {
    statusBar.removeChild(typingUsers[username])
    delete typingUsers[username]
  }
}
socket.on('stop typing', (data) => {
  setTimeout(() => {
    endTyping(data.username);
  }, 300);
});