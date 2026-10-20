using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Livros.Api.Configuracoes;
using Livros.Api.Services;
using Livros.Dados;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var construtor = WebApplication.CreateBuilder(args);
construtor.Services.Configure<OpcoesDaApi>(construtor.Configuration.GetSection(OpcoesDaApi.Secao));

static void AjustarJson(JsonSerializerOptions opcoes)
{
    opcoes.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    opcoes.DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower;
    opcoes.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
}

construtor.Services.AddControllers().AddJsonOptions(opcoes => AjustarJson(opcoes.JsonSerializerOptions));
construtor.Services.ConfigureHttpJsonOptions(opcoes => AjustarJson(opcoes.SerializerOptions));

var conexao = construtor.Configuration.GetConnectionString("BancoLivros");
if (string.IsNullOrWhiteSpace(conexao) && !string.IsNullOrWhiteSpace(construtor.Configuration["DB_HOST"]))
{
    var configuracaoBanco = new Npgsql.NpgsqlConnectionStringBuilder
    {
        Host = construtor.Configuration["DB_HOST"],
        Database = construtor.Configuration["DB_NAME"],
        Username = construtor.Configuration["DB_USER"],
        Password = construtor.Configuration["DB_PASSWORD"]
    };
    conexao = configuracaoBanco.ConnectionString;
}
if (string.IsNullOrWhiteSpace(conexao))
    throw new InvalidOperationException("Configure ConnectionStrings__BancoLivros ou DB_HOST, DB_NAME, DB_USER e DB_PASSWORD.");

construtor.Services.AddDbContext<ContextoLivros>(opcoes =>
    opcoes.UseNpgsql(conexao).UseSnakeCaseNamingConvention());

construtor.Services.AddScoped<LivrosService>();
construtor.Services.AddScoped<CategoriasService>();
construtor.Services.AddScoped<RecomendacoesService>();
construtor.Services.AddScoped<UsuariosService>();
construtor.Services.AddScoped<LivrosSalvosService>();
construtor.Services.AddScoped<AutenticacaoService>();

construtor.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(opcoes =>
    {
        opcoes.Cookie.Name = "nextread.session";
        opcoes.Cookie.HttpOnly = true;
        opcoes.Cookie.SameSite = construtor.Environment.IsDevelopment()
            ? SameSiteMode.Lax
            : SameSiteMode.None;
        opcoes.Cookie.SecurePolicy = construtor.Environment.IsDevelopment()
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        opcoes.ExpireTimeSpan = TimeSpan.FromHours(8);
        opcoes.SlidingExpiration = false;
        opcoes.Events.OnRedirectToLogin = contexto =>
        {
            contexto.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        opcoes.Events.OnRedirectToAccessDenied = contexto =>
        {
            contexto.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
construtor.Services.AddAuthorization();

// Bloqueia tentativas excessivas de cadastro e login por endereco IP.
construtor.Services.AddRateLimiter(opcoes =>
{
    opcoes.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    opcoes.AddPolicy("entrada", contexto => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: contexto.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
});

construtor.Services.AddOpenApi();
construtor.Services.AddProblemDetails();

// Nunca usar AllowAnyOrigin com AllowCredentials. Em producao, configurar
// Cors__OrigensPermitidas__0 para a origem EXATA do frontend HTTPS.
var origens = construtor.Configuration.GetSection("Cors:OrigensPermitidas").Get<string[]>() ?? [];
if (construtor.Environment.IsDevelopment() && origens.Length == 0)
    origens = ["http://localhost:5500", "http://127.0.0.1:5500"];
construtor.Services.AddCors(opcoes => opcoes.AddDefaultPolicy(politica =>
{
    if (origens.Length > 0)
        politica.WithOrigins(origens).AllowAnyMethod().AllowAnyHeader().AllowCredentials();
}));

var aplicacao = construtor.Build();
aplicacao.UseExceptionHandler();
if (aplicacao.Environment.IsDevelopment())
{
    aplicacao.MapOpenApi();
    aplicacao.UseSwaggerUI(opcoes => opcoes.SwaggerEndpoint("/openapi/v1.json", "API NextRead"));
}

aplicacao.UseRouting();
aplicacao.UseCors();
aplicacao.UseRateLimiter();

// Protecao CSRF: endpoints mutaveis so aceitam um header nao enviavel por
// forms HTML cross-site. Outros dominios nao conseguem passa-lo no CORS.
aplicacao.Use(async (contexto, proximo) =>
{
    if (HttpMethods.IsPost(contexto.Request.Method) || HttpMethods.IsPut(contexto.Request.Method)
        || HttpMethods.IsPatch(contexto.Request.Method) || HttpMethods.IsDelete(contexto.Request.Method))
    {
        if (contexto.Request.Headers["X-NextRead-Request"] != "1")
        {
            contexto.Response.StatusCode = StatusCodes.Status400BadRequest;
            await contexto.Response.WriteAsJsonAsync(new { mensagem = "Cabecalho X-NextRead-Request obrigatorio" });
            return;
        }
    }
    await proximo(contexto);
});

aplicacao.UseAuthentication();
aplicacao.UseAuthorization();
aplicacao.MapGet("/pronto", () => Results.Ok(new { status = "iniciado" })).WithTags("Infra");
aplicacao.MapControllers();
aplicacao.Run();
