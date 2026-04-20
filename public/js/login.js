document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.login-form');

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Evitar el envío por defecto del formulario

        // Aquí puedes agregar validación si es necesario
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (email && password) {
            // Enviar solicitud POST al servidor para iniciar sesión
            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Login exitoso') {
                    localStorage.setItem('skillswapCurrentUserEmail', email.trim().toLowerCase());
                    window.location.href = '/dashboard';
                } else {
                    alert(data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error en el servidor.');
            });
        } else {
            alert('Por favor, ingresa tu correo y contraseña.');
        }
    });
});
