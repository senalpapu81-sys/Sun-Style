document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const usernameSpan = document.getElementById('username-text');
    const addItemBtn = document.getElementById('add-item-btn');
    const addItemForm = document.getElementById('add-item-form');
    const itemList = document.getElementById('item-list');

    // Pedir nombre de usuario
    let username = localStorage.getItem('username');
    if (!username) {
        username = prompt('Por favor, ingresa tu nombre de usuario:');
        if (username) {
            localStorage.setItem('username', username);
        } else {
            username = 'Invitado';
        }
    }
    usernameSpan.textContent = username;

    // Mostrar/ocultar formulario de agregar prenda
    if (addItemBtn && addItemForm) {
        addItemBtn.addEventListener('click', () => {
            addItemForm.style.display = addItemForm.style.display === 'block' ? 'none' : 'block';
        });
    }

    // Escuchar nuevos items del servidor (Socket.io)
    socket.on('new-item', (item) => {
        const newItemCard = document.createElement('a');
        newItemCard.href = `/item/${item.id}`;
        newItemCard.className = 'item-card';
        newItemCard.innerHTML = `
            <img src="/images/${item.image}" alt="${item.name}">
            <div class="item-info">
                <h3>${item.name}</h3>
                <p class="price">$${item.price}</p>
            </div>
        `;
        if (itemList) {
            itemList.prepend(newItemCard);
        }
    });
});