-- Master admin bootstrap + signup auto-promotion for nayara.melo@caixaconsorcio.com.br

UPDATE public.profiles
SET role = 'admin',
    active = true,
    updated_at = now()
WHERE lower(email) = 'nayara.melo@caixaconsorcio.com.br';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  initial_role TEXT := 'viewer';
  user_count INTEGER;
  new_email TEXT := lower(COALESCE(NEW.email, ''));
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  IF new_email = 'nayara.melo@caixaconsorcio.com.br' THEN
    initial_role := 'admin';
  ELSIF user_count = 0 THEN
    initial_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, 'usuario'), '@', 1)),
    initial_role
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
        role = CASE
          WHEN lower(EXCLUDED.email) = 'nayara.melo@caixaconsorcio.com.br' THEN 'admin'
          ELSE public.profiles.role
        END,
        active = CASE
          WHEN lower(EXCLUDED.email) = 'nayara.melo@caixaconsorcio.com.br' THEN true
          ELSE public.profiles.active
        END,
        updated_at = now();

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_master_admin_email(p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT lower(COALESCE(p_email, '')) = 'nayara.melo@caixaconsorcio.com.br';
$function$;

CREATE OR REPLACE FUNCTION public.protect_master_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_master_admin_email(OLD.email) THEN
    IF NEW.role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'O administrador master não pode ter o papel alterado.';
    END IF;
    IF NEW.active IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'O administrador master não pode ser desativado.';
    END IF;
    NEW.email := OLD.email;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_master_admin ON public.profiles;
CREATE TRIGGER trg_protect_master_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_master_admin();
