-- =====================================================================
-- MISE EN SERVICE : à lancer UNE FOIS, juste avant l'ouverture au public,
-- dans Supabase > SQL Editor. Supprime les rendez-vous et clientes de test,
-- garde les prestations, l'équipe, les horaires et les réglages.
-- =====================================================================
delete from appointments;
delete from clients;
delete from stylist_absences;
delete from salon_closures where reason = 'Congés d''été' and start_date < current_date; -- fermetures passées de test

-- Ensuite, dans Supabase > Authentication > Users :
--   - supprimer les comptes *@atelier-julie.test
--   - créer le vrai compte de Julie, puis lui donner le rôle admin :
--       insert into profiles (id, full_name, role, stylist_id)
--       select id, 'Julie', 'admin', '11111111-1111-1111-1111-111111111111'
--       from auth.users where email = 'EMAIL-DE-JULIE';
--   - les accès de Sarah et Inès se créent ensuite depuis le back-office (Équipe).
