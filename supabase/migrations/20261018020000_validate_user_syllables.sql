-- Clear typed splits that don't spell the word or use an unknown type before
-- they're stored, so bad or junk submissions never count toward promotion.
create or replace function public.validate_user_syllables()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_syllables is null then
    return new;
  end if;

  if jsonb_typeof(new.user_syllables) <> 'array'
     or jsonb_array_length(new.user_syllables) = 0
     or (select coalesce(string_agg(lower(s->>'text'), '' order by i), '')
         from jsonb_array_elements(new.user_syllables) with ordinality as t(s, i)) <> new.word
     or exists (
       select 1 from jsonb_array_elements(new.user_syllables) s
       where s->>'stype' is null or not (s->>'stype' = any (case new.lang
         when 'es' then array['Abierta','Cerrada','Diptongo','Hiato','Grupo Consonántico']
         else array['Closed','Magic-E','Vowel Team','R-Controlled','Open','C+le'] end)))
  then
    new.user_syllables := null;
    return new;
  end if;

  -- Store a canonical form (lowercase, only text/stype) so equal votes match.
  new.user_syllables := (
    select jsonb_agg(jsonb_build_object('text', lower(s->>'text'), 'stype', s->>'stype') order by i)
    from jsonb_array_elements(new.user_syllables) with ordinality as t(s, i));

  return new;
end;
$$;

revoke execute on function public.validate_user_syllables() from public, anon, authenticated;

drop trigger if exists before_word_correction_validate on public.word_corrections;
create trigger before_word_correction_validate
  before insert on public.word_corrections
  for each row execute function public.validate_user_syllables();
