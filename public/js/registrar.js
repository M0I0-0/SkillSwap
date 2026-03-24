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

    function showError(input, message) {
        const inputGroup = input.closest(".input-group");
        const errorElement = inputGroup.querySelector(".error-message");

        input.classList.remove("input-success");
        input.classList.add("input-error");
        inputGroup.classList.add("has-error");
        errorElement.textContent = message;
    }

    function showSuccess(input) {
        const inputGroup = input.closest(".input-group");
        const errorElement = inputGroup.querySelector(".error-message");

        input.classList.remove("input-error");
        input.classList.add("input-success");
        inputGroup.classList.remove("has-error");
        errorElement.textContent = "";
    }

    function isEmpty(value) {
        return value.trim() === "";
    }

    function onlyLetters(value) {
        return /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(value.trim());
    }

    function onlyNumbers(value) {
        return /^\d+$/.test(value.trim());
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    }

    function isSecurePassword(value) {
        return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);
    }

    function validateOnlyLettersField(input, fieldName) {
        if (isEmpty(input.value)) {
            showError(input, `El campo ${fieldName} es obligatorio.`);
            return false;
        }

        if (!onlyLetters(input.value)) {
            showError(input, `El campo ${fieldName} solo debe contener letras.`);
            return false;
        }

        showSuccess(input);
        return true;
    }

    function validateOnlyNumbersField(input, fieldName) {
        if (isEmpty(input.value)) {
            showError(input, `El campo ${fieldName} es obligatorio.`);
            return false;
        }

        if (!onlyNumbers(input.value)) {
            showError(input, `El campo ${fieldName} solo debe contener números.`);
            return false;
        }

        showSuccess(input);
        return true;
    }

    function validateEmailField(input) {
        if (isEmpty(input.value)) {
            showError(input, "El correo electrónico es obligatorio.");
            return false;
        }

        if (!isValidEmail(input.value)) {
            showError(input, "Ingresa un correo electrónico válido.");
            return false;
        }

        showSuccess(input);
        return true;
    }

    function validateSelectField(input, fieldName) {
        if (isEmpty(input.value)) {
            showError(input, `Selecciona una opción en ${fieldName}.`);
            return false;
        }

        showSuccess(input);
        return true;
    }

    function validatePasswordField(input) {
        if (isEmpty(input.value)) {
            showError(input, "La contraseña es obligatoria.");
            return false;
        }

        if (!isSecurePassword(input.value)) {
            showError(input, "Debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial.");
            return false;
        }

        showSuccess(input);
        return true;
    }

    function validateConfirmPasswordField(passwordInput, confirmInput) {
        if (isEmpty(confirmInput.value)) {
            showError(confirmInput, "Debes confirmar la contraseña.");
            return false;
        }

        if (passwordInput.value !== confirmInput.value) {
            showError(confirmInput, "Las contraseñas no coinciden.");
            return false;
        }

        showSuccess(confirmInput);
        return true;
    }

    function validateForm() {
        let isValid = true;

        if (!validateOnlyLettersField(nombres, "Nombres")) isValid = false;
        if (!validateOnlyLettersField(apellidoPaterno, "Apellido Paterno")) isValid = false;
        if (!validateOnlyLettersField(apellidoMaterno, "Apellido Materno")) isValid = false;
        if (!validateOnlyNumbersField(matricula, "Matrícula")) isValid = false;
        if (!validateOnlyLettersField(carrera, "Carrera")) isValid = false;
        if (!validateEmailField(correo)) isValid = false;
        if (!validateOnlyLettersField(intereses, "Intereses")) isValid = false;
        if (!validateSelectField(disponibilidad, "Disponibilidad")) isValid = false;
        if (!validatePasswordField(password)) isValid = false;
        if (!validateConfirmPasswordField(password, confirmPassword)) isValid = false;

        return isValid;
    }

    form.addEventListener("submit", function (e) {
        if (!validateForm()) {
            e.preventDefault();
            console.log("Formulario bloqueado por errores");
        }
    });

    nombres.addEventListener("blur", () => validateOnlyLettersField(nombres, "Nombres"));
    apellidoPaterno.addEventListener("blur", () => validateOnlyLettersField(apellidoPaterno, "Apellido Paterno"));
    apellidoMaterno.addEventListener("blur", () => validateOnlyLettersField(apellidoMaterno, "Apellido Materno"));
    matricula.addEventListener("blur", () => validateOnlyNumbersField(matricula, "Matrícula"));
    carrera.addEventListener("blur", () => validateOnlyLettersField(carrera, "Carrera"));
    intereses.addEventListener("blur", () => validateOnlyLettersField(intereses, "Intereses"));
    correo.addEventListener("blur", () => validateEmailField(correo));
    disponibilidad.addEventListener("change", () => validateSelectField(disponibilidad, "Disponibilidad"));
    password.addEventListener("blur", () => validatePasswordField(password));
    confirmPassword.addEventListener("blur", () => validateConfirmPasswordField(password, confirmPassword));

    // Bloquear caracteres incorrectos mientras escribe
    function allowOnlyLettersInput(input) {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, "");
        });
    }

    function allowOnlyNumbersInput(input) {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "");
        });
    }

    allowOnlyLettersInput(nombres);
    allowOnlyLettersInput(apellidoPaterno);
    allowOnlyLettersInput(apellidoMaterno);
    allowOnlyLettersInput(carrera);
    allowOnlyLettersInput(intereses);
    allowOnlyNumbersInput(matricula);
});