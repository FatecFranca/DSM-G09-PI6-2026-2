using System.Text;

namespace Livros.Api;

public static class Filtros
{
    private const char Barra = '\\';

    // monta o padrao do ILIKE escapando % e _ digitados pelo usuario,
    // que senao virariam curinga e bagunçariam a busca
    public static string MontarPadraoDeBusca(string termo)
    {
        var texto = termo.Trim();
        var construtor = new StringBuilder(texto.Length + 8);

        construtor.Append('%');
        foreach (var caractere in texto)
        {
            if (caractere is '%' or '_' or Barra)
            {
                construtor.Append(Barra);
            }

            construtor.Append(caractere);
        }

        construtor.Append('%');
        return construtor.ToString();
    }
}
