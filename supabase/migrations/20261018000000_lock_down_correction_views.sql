-- Views should respect the caller's RLS, and only the admin dashboard
-- (service role) should read correction data.
alter view public.word_syllabification_confidence set (security_invoker = true);
alter view public.flagged_words                   set (security_invoker = true);
alter view public.correction_stats                set (security_invoker = true);

revoke select on public.word_syllabification_confidence from anon, authenticated;
revoke select on public.flagged_words                   from anon, authenticated;
revoke select on public.correction_stats                from anon, authenticated;
revoke select, update, delete on public.word_corrections from anon, authenticated;
