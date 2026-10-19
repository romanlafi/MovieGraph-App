import assert from 'node:assert/strict';
import {test} from 'vitest';
import {validateRegistration, registrationResponseErrors, todayDate} from '../src/utils/registrationValidation.ts';

const valid = () => ({username: 'movie-fan', email: 'fan@example.com', password: 'a-long-password', birthdate: '1990-01-15', bio: '', favorite_genres: []});

test('required fields have individual messages; optional fields can stay empty', () => {
    assert.deepEqual(validateRegistration(valid()), {});
    const errors = validateRegistration({...valid(), username: '', email: '', password: '', birthdate: ''});
    assert.deepEqual(Object.keys(errors), ['username', 'email', 'password', 'birthdate']);
});

test('username boundaries count Unicode characters and reject whitespace-only names', () => {
    for (const username of ['a', 'x'.repeat(41), '  ']) assert.ok(validateRegistration({...valid(), username}).username);
    for (const username of ['ab', 'x'.repeat(40), '🎬'.repeat(40)]) assert.equal(validateRegistration({...valid(), username}).username, undefined);
});

test('email is required and malformed addresses are rejected', () => {
    for (const email of ['invalid', 'a@', '@example.com', 'a b@example.com', 'a@@example.com', 'a@example', 'a@.example.com', 'a@example..com', '.a@example.com', 'a..b@example.com', 'a@-example.com']) {
        assert.ok(validateRegistration({...valid(), email}).email);
    }
    assert.equal(validateRegistration({...valid(), email: ' fan+movies@example.com '}).email, undefined);
});

test('password minimum counts Unicode characters; maximum counts UTF-8 bytes', () => {
    for (const password of ['x'.repeat(11), '🎬'.repeat(6), 'x'.repeat(73), 'é'.repeat(37), '🎬'.repeat(19)]) {
        assert.ok(validateRegistration({...valid(), password}).password);
    }
    for (const password of ['x'.repeat(12), 'x'.repeat(72), 'é'.repeat(36), '🎬'.repeat(18)]) {
        assert.equal(validateRegistration({...valid(), password}).password, undefined);
    }
});

test('birthdate must be a real date and cannot be in the future', () => {
    for (const birthdate of ['', 'not-a-date', '2025-02-29', '2024-02-30', '0000-01-01', '9999-12-31']) {
        assert.ok(validateRegistration({...valid(), birthdate}).birthdate);
    }
    for (const birthdate of ['2024-02-29', todayDate()]) assert.equal(validateRegistration({...valid(), birthdate}).birthdate, undefined);
});

test('bio and genre preferences obey the backend size limits', () => {
    assert.equal(validateRegistration({...valid(), bio: '🎬'.repeat(500)}).bio, undefined);
    assert.ok(validateRegistration({...valid(), bio: 'a'.repeat(501)}).bio);
    assert.equal(validateRegistration({...valid(), favorite_genres: Array(20).fill('Drama')}).favorite_genres, undefined);
    for (const favorite_genres of [Array(21).fill('Drama'), [' '], ['a'.repeat(41)]]) {
        assert.ok(validateRegistration({...valid(), favorite_genres}).favorite_genres);
    }
});

test('422 errors map to fields without displaying submitted values', () => {
    const result = registrationResponseErrors({detail: [
        {loc: ['body', 'password'], type: 'string_too_short', input: 'private-password'},
        {loc: ['body', 'favorite_genres', 0], msg: 'raw error'},
        {loc: ['body', 'unknown']}, null,
    ]});
    assert.ok(result.fields.password);
    assert.ok(result.fields.favorite_genres);
    assert.equal(JSON.stringify(result).includes('private-password'), false);
});

test('duplicate identities map to their inputs and unexpected responses have a readable fallback', () => {
    assert.ok(registrationResponseErrors({detail: {error: 'email_conflict', message: 'Email already registered'}}).fields.email);
    assert.ok(registrationResponseErrors({detail: {error: 'user_conflict', message: 'Username already registered'}}).fields.username);
    for (const data of [null, {}, 'invalid', {detail: [null, {}, {loc: null}]}]) assert.ok(registrationResponseErrors(data).message);
    assert.equal(registrationResponseErrors({detail: 'Service unavailable'}).message, 'Service unavailable');
});
