console.log("registrar.js cargado");

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registerForm");

    const nombres = document.getElementById("nombres");
    const apellidoPaterno = document.getElementById("apellidoPaterno");
    const apellidoMaterno = document.getElementById("apellidoMaterno");
    const matricula = document.getElementById("matricula");
    const carrera = document.getElementById("carrera");
    const correo = document.getElementById("correo");
    const intereses = document.getElementById("intereses");
    const disponibilidad = document.getElementById("disponibilidad");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    function isEmpty(value) {
        return value.trim() === "";
    }

    function validateForm() {
        return !(
            isEmpty(nombres.value) ||
            isEmpty(apellidoPaterno.value) ||
            isEmpty(matricula.value) ||
            isEmpty(correo.value) ||
            isEmpty(password.value)
        );
    }

    // 🚀 ENVÍO REAL AL BACKEND
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            alert("Completa todos los campos");
            return;
        }

        if (password.value !== confirmPassword.value) {
            alert("Las contraseñas no coinciden");
            return;
        }

        const data = {
            nombres: nombres.value,
            apellidoPaterno: apellidoPaterno.value,
            apellidoMaterno: apellidoMaterno.value,
            matricula: matricula.value,
            carrera: carrera.value,
            correo: correo.value,
            intereses: intereses.value,
            disponibilidad: disponibilidad.value,
            password: password.value
        };

        try {
            const response = await fetch("/registrar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                alert("Registro exitoso 🚀");
                form.reset();
                window.location.href = "/";
            } else {
                alert(result.message);
            }

        } catch (error) {
            console.error(error);
            alert("Error del servidor");
        }
    });
});