using System.Text.Json;
using System.Text.Json.Serialization;
using Livros.Api.Configuracoes;
using Livros.Api.Services;
using Livros.Dados;
using Microsoft.EntityFrameworkCore;

var construtor = WebApplication.CreateBuilder(args);

construtor.Services.Configure<OpcoesDaApi>(construtor.Configuration.GetSection(OpcoesDaApi.Secao));

// o json sai em snake_case para bater com as colunas do banco e com o front
static void AjustarJson(JsonSerializerOptions opcoes)
{
    opcoes.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    opcoes.DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower;
    opcoes.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
}

construtor.Services.AddControllers().AddJsonOptions(opcoes => AjustarJson(opcoes.JsonSerializerOptions));

// o gerador do openapi le daqui, nao do AddJsonOptions; sem isso o swagger
// mostraria camelCase enquanto a api devolve snake_case
construtor.Services.ConfigureHttpJsonOptions(opcoes => AjustarJson(opcoes.SerializerOptions));

var conexao = construtor.Configuration.GetConnectionString("BancoLivros")
    ?? throw new InvalidOperationException("defina a connection string BancoLivros");

construtor.Services.AddDbContext<ContextoLivros>(opcoes =>
    opcoes.UseNpgsql(conexao).UseSnakeCaseNamingConvention());

construtor.Services.AddScoped<LivrosService>();
construtor.Services.AddScoped<CategoriasService>();
construtor.Services.AddScoped<RecomendacoesService>();
construtor.Services.AddScoped<UsuariosService>();

construtor.Services.AddOpenApi();
construtor.Services.AddProblemDetails();

construtor.Services.AddCors(opcoes =>
    opcoes.AddDefaultPolicy(politica => politica.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var aplicacao = construtor.Build();

aplicacao.UseExceptionHandler();
aplicacao.MapOpenApi();
aplicacao.UseSwaggerUI(opcoes => opcoes.SwaggerEndpoint("/openapi/v1.json", "API de Recomendacao de Livros"));

if (!aplicacao.Environment.IsDevelopment())
{
    aplicacao.UseHttpsRedirection();
}

aplicacao.UseCors();
aplicacao.MapControllers();

aplicacao.Run();
