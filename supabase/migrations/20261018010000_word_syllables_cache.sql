-- ============================================================
-- Word cache: one row per (lang, word) so repeat words skip the AI.
-- Only the server (/api/analyze, service role) reads or writes it.
-- ============================================================
create table if not exists public.word_syllables (
  lang        text        not null check (lang in ('en','es')),
  word        text        not null,               -- lowercased
  syllables   jsonb       not null,               -- [{"text":"snap","stype":"Closed"}]
  source      text        not null default 'ai' check (source in ('ai','community','admin')),
  hits        integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (lang, word)
);

alter table public.word_syllables enable row level security;
revoke all on public.word_syllables from anon, authenticated;

-- Count cache hits in one round trip.
create or replace function public.bump_word_hits(p_lang text, p_words text[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.word_syllables
  set hits = hits + 1
  where lang = p_lang and word = any (p_words);
$$;

revoke execute on function public.bump_word_hits(text, text[]) from public, anon, authenticated;

-- ============================================================
-- Corrections now carry language and the full typed split, so
-- agreed-on corrections can replace the AI's cached answer.
-- ============================================================
alter table public.word_corrections add column if not exists lang text not null default 'en';
alter table public.word_corrections add column if not exists user_syllables jsonb;

-- When 3+ people (by session) submit the same typed split and they are
-- at least 80% of everyone who corrected that word, promote it.
create or replace function public.promote_word_correction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_top        jsonb;
  v_top_users  integer;
  v_all_users  integer;
begin
  if new.user_syllables is null or jsonb_typeof(new.user_syllables) <> 'array' then
    return new;
  end if;

  -- The typed split must spell the word, or it can't be trusted.
  if (select coalesce(string_agg(lower(s->>'text'), '' order by i), '')
      from jsonb_array_elements(new.user_syllables) with ordinality as t(s, i)) <> new.word then
    return new;
  end if;

  -- Every syllable needs a real type for its language.
  if exists (
    select 1 from jsonb_array_elements(new.user_syllables) s
    where s->>'stype' is null or not (s->>'stype' = any (case new.lang
      when 'es' then array['Abierta','Cerrada','Diptongo','Hiato','Grupo Consonántico']
      else array['Closed','Magic-E','Vowel Team','R-Controlled','Open','C+le'] end))
  ) then
    return new;
  end if;

  select c.user_syllables, count(distinct c.session_id)
    into v_top, v_top_users
  from public.word_corrections c
  where c.lang = new.lang and c.word = new.word and c.user_syllables is not null
  group by c.user_syllables
  order by count(distinct c.session_id) desc
  limit 1;

  select count(distinct c.session_id) into v_all_users
  from public.word_corrections c
  where c.lang = new.lang and c.word = new.word and c.user_syllables is not null;

  if v_top_users >= 3 and v_top_users * 1.0 / v_all_users >= 0.8 then
    insert into public.word_syllables (lang, word, syllables, source)
    values (new.lang, new.word, v_top, 'community')
    on conflict (lang, word) do update
      set syllables = excluded.syllables, source = 'community', updated_at = now()
      where public.word_syllables.source <> 'admin';
  end if;

  return new;
exception when others then
  -- Never lose a correction because promotion failed.
  raise warning 'promote_word_correction failed for %: %', new.word, sqlerrm;
  return new;
end;
$$;

revoke execute on function public.promote_word_correction() from public, anon, authenticated;

drop trigger if exists on_word_correction_promote on public.word_corrections;
create trigger on_word_correction_promote
  after insert on public.word_corrections
  for each row execute function public.promote_word_correction();
