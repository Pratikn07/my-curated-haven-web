-- DRILL R4-04. DO NOT MERGE. DO NOT APPLY.
-- Deliberately lets anonymous callers read every recipe body, including paid ones.
-- backend-quality must fail on this and block the merge.
CREATE POLICY "drill leak: anyone reads every body"
  ON public.recipe_bodies FOR SELECT TO anon USING (true);
