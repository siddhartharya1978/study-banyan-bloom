import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Globe } from 'lucide-react';

const LanguageToggle = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    await i18n.changeLanguage(newLang);

    // Update user profile if logged in
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase
          .from('profiles')
          .update({ preferred_language: newLang })
          .eq('id', session.user.id);
      }
    } catch (error) {
      console.error('Error updating language preference:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2"
    >
      <Globe className="h-4 w-4" />
      <span className="font-semibold">{i18n.language === 'en' ? 'हिं' : 'EN'}</span>
    </Button>
  );
};

export default LanguageToggle;
