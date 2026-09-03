import re

from pydantic import BaseModel, ConfigDict

_PadraoMaiuscula = re.compile(r"(?<!^)(?=[A-Z])")


def ParaSnakeCase(nome: str) -> str:
    return _PadraoMaiuscula.sub("_", nome).lower()


class BaseSchema(BaseModel):
    # atributos em PascalCase no python, json em snake_case igual ao banco
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=ParaSnakeCase,
        populate_by_name=True,
    )
